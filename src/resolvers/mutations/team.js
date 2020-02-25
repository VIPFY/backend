import { decode } from "jsonwebtoken";
import moment from "moment";
import { teamPicFolder } from "../../constants";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import {
  createLog,
  createNotification,
  teamCheck,
  companyCheck,
  checkPlanValidity,
  formatHumanName
} from "../../helpers/functions";
import { uploadTeamImage, deleteUserImage } from "../../services/aws";
import { createHuman } from "../../helpers/employee";
import { sendEmail } from "../../helpers/email";
import {
  checkOrbitMembership,
  checkCompanyMembership
} from "../../helpers/companyMembership";

export default {
  createTeam: requiresRights(["create-team"]).createResolver(
    async (_p, { team, addemployees, apps }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { unitid, company }
          } = decode(session.token);

          const { name, picture, ...teamdata } = team;
          const unitArgs = {};
          if (picture) {
            const parsedFile = await picture;

            const profilepicture = await uploadTeamImage(
              parsedFile,
              teamPicFolder
            );

            unitArgs.profilepicture = profilepicture;
          }

          const unit = await models.Unit.create(unitArgs, { transaction: ta });

          const p1 = models.DepartmentData.create(
            {
              unitid: unit.dataValues.id,
              name,
              internaldata: { created: Date.now(), ...teamdata }
            },
            { transaction: ta }
          );

          const p2 = models.ParentUnit.create(
            { parentunit: company, childunit: unit.dataValues.id },
            { transaction: ta }
          );

          const [department, parentUnit] = await Promise.all([p1, p2]);

          //add employees

          const employeepromises = [];
          let counter = 0;
          const newemployees = [];
          for await (const employee of addemployees) {
            if (employee.id == "new") {
              const userid = await createHuman(
                models,
                ta,
                company,
                employee.name,
                employee.password,
                employee.wmail1,
                employee.wmail2
              );

              employee.id = userid;
              newemployees.push({ email: employee.wmail1, id: userid });

              employeepromises.push(
                models.ParentUnit.create(
                  { parentunit: unit.dataValues.id, childunit: userid },
                  { transaction: ta }
                )
              );
              const e1 = models.Human.findOne({ where: { unitid } });

              const e2 = models.DepartmentData.findOne({
                where: { unitid: company }
              });

              const [requester, companyObj] = await Promise.all([e1, e2]);
              await sendEmail({
                templateId: "d-e049cce50d20428d81f011e521605d4c",
                fromName: "VIPFY",
                personalizations: [
                  {
                    to: [
                      {
                        email: employee.wmail1,
                        name: employee.name
                      }
                    ],
                    dynamic_template_data: {
                      name: employee.name,
                      creator: formatHumanName(requester),
                      companyname: companyObj.name,
                      email: employee.wmail1,
                      password: employee.password
                    }
                  }
                ]
              });

              await createNotification({
                receiver: unitid,
                message: `${employee.name} was successfully created`,
                icon: "user-plus",
                link: "employeemanager",
                changed: []
              });
              counter++;
            } else {
              employeepromises.push(
                models.ParentUnit.create(
                  { parentunit: unit.dataValues.id, childunit: employee.id },
                  { transaction: ta }
                )
              );
            }
          }

          await Promise.all(employeepromises);

          //services aufsetzen

          for await (const service of apps) {
            const servicepromises = [];
            const app = await models.Plan.findOne({
              where: { id: service.id },
              raw: true,
              transaction: ta
            });

            const plan = await models.Plan.findOne({
              where: { appid: service.id, options: { external: true } },
              raw: true,
              transaction: ta
            });

            if (!plan) {
              throw new Error(
                "This App is not integrated to handle external Accounts yet."
              );
            }
            await checkPlanValidity(plan);

            const boughtPlan = await models.BoughtPlan.create(
              {
                planid: plan.id,
                alias: app.name,
                disabled: false,
                buyer: unitid,
                payer: company,
                usedby: company,
                totalprice: 0,
                key: {
                  external: true,
                  externaltotalprice: 0
                }
              },
              { transaction: ta }
            );

            await models.DepartmentApp.create(
              { departmentid: unit.dataValues.id, boughtplanid: boughtPlan.id },
              { transaction: ta }
            );

            service.employees.forEach(employee => {
              const empid = newemployees.find(e => e.email == employee.wmail1)
                ? newemployees.find(e => e.email == employee.wmail1).id
                : employee.id;
              servicepromises.push(
                models.LicenceData.create(
                  {
                    unitid: empid,
                    disabled: false,
                    boughtplanid: boughtPlan.id,
                    agreed: true,
                    key: {
                      email: employee.setup.email,
                      password: employee.setup.password,
                      subdomain: employee.setup.subdomain,
                      external: true
                    },
                    options: employee.setupfinished
                      ? {
                          teamlicence: unit.dataValues.id
                        }
                      : {
                          teamlicence: unit.dataValues.id,
                          nosetup: true
                        }
                  },
                  { transaction: ta }
                )
              );
            });

            await Promise.all(servicepromises);
          }

          await createLog(ctx, "addTeam", { unit, department, parentUnit }, ta);

          const employeeNotifypromises = [];
          addemployees.forEach(employee =>
            employeeNotifypromises.push(
              createNotification({
                receiver: employee.id,
                message: `You are now assigned to team ${name}`,
                icon: "users",
                link: "teammanger",
                changed: ["ownLicences"]
              })
            )
          );

          await Promise.all(employeeNotifypromises);

          return unit.dataValues.id;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  deleteTeam: requiresRights(["delete-team"]).createResolver(
    async (_, { teamid, deletejson, endtime }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
            user: { company }
          } = decode(session.token);

          await teamCheck(company, teamid);

          const oldTeam = await models.sequelize.query(
            `SELECT * FROM team_view WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta
            }
          );

          await Promise.all(
            deletejson.users.map(async user => {
              const deleteUserJson = user;
              const userid = user.userid;

              //START DELETE ONE EMPLOYEE
              const promises = [];

              // Delete all assignments of as
              await Promise.all(
                deleteUserJson.assignments.map(async as => {
                  if (as.bool) {
                    promises.push(
                      models.LicenceRight.update(
                        {
                          endtime
                        },
                        {
                          where: { id: as.id },
                          transaction: ta
                        }
                      )
                    );
                  } else {
                    // Remove team tag and assignoption
                    const checkassignment = await models.LicenceRight.findOne({
                      where: { id: as.id },
                      raw: true,
                      transaction: ta
                    });
                    if (
                      checkassignment.tags &&
                      checkassignment.tags.includes("teamlicence") &&
                      checkassignment.options &&
                      checkassignment.options.teamlicence == teamid
                    ) {
                      let newtags = checkassignment.tags;
                      newtags.splice(
                        checkassignment.tags.findIndex(e => e == "teamlicence"),
                        1
                      );
                      promises.push(
                        models.LicenceRight.update(
                          {
                            tags: newtags,
                            options: {
                              ...checkassignment.options,
                              teamlicence: undefined
                            }
                          },
                          {
                            where: { id: as.id },
                            transaction: ta
                          }
                        )
                      );
                    }
                  }
                })
              );
              await Promise.all(promises);

              //Check for other assignments
              if (deleteUserJson.autodelete) {
                await Promise.all(
                  deleteUserJson.assignments.map(async asa => {
                    const licenceRight = await models.LicenceRight.findOne({
                      where: { id: asa.id },
                      raw: true,
                      transaction: ta
                    });

                    const licences = await models.sequelize.query(
                      `SELECT * FROM licence_view WHERE id = :licenceid and endtime > now() or endtime is null`,
                      {
                        replacements: { licenceid: licenceRight.licenceid },
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction: ta
                      }
                    );

                    if (licences.length == 0) {
                      await models.LicenceData.update(
                        {
                          endtime
                        },
                        {
                          where: { id: licenceRight.licenceid },
                          transaction: ta
                        }
                      );

                      const otherlicences = await models.sequelize.query(
                        `Select distinct (lva.*)
                    from licence_view lva left outer join licence_view lvb on lva.boughtplanid = lvb.boughtplanid
                    where lvb.id = :licenceid and lva.starttime < now() and lva.endtime > now();`,
                        {
                          replacements: { licenceid: licenceRight.licenceid },
                          type: models.sequelize.QueryTypes.SELECT,
                          transaction: ta
                        }
                      );

                      if (otherlicences.length == 0) {
                        const boughtplan = await models.sequelize.query(
                          `SELECT boughtplanid FROM licence_view WHERE id = :licenceid`,
                          {
                            replacements: { licenceid: licenceRight.licenceid },
                            type: models.sequelize.QueryTypes.SELECT,
                            transaction: ta
                          }
                        );

                        await models.BoughtPlan.update(
                          {
                            endtime
                          },
                          {
                            where: { id: boughtplan[0].boughtplanid },
                            transaction: ta
                          }
                        );
                      }
                    }
                  })
                );
              }

              await models.ParentUnit.destroy({
                where: { parentunit: teamid, childunit: userid },
                transaction: ta
              });

              //END ONE EMPLOYEE DELETED
            })
          );

          //End TeamOrbits

          const deletePromises = [];

          console.log("END TEAMORBITS");

          deletePromises.push(
            models.DepartmentApp.update(
              {
                endtime
              },
              {
                where: { departmentid: teamid, endtime: Infinity },
                transaction: ta
              }
            )
          );

          deletePromises.push(
            models.Unit.update(
              { deleted: true },
              { where: { id: teamid }, transaction: ta }
            )
          );

          deletePromises.push(
            models.ParentUnit.destroy({
              where: {
                [models.Op.or]: [{ childunit: teamid }, { parentunit: teamid }]
              },
              transaction: ta
            })
          );

          await Promise.all(deletePromises);

          await createLog(
            ctx,
            "deleteTeam",
            {
              teamid,
              deletejson
            },
            ta
          );

          if (oldTeam[0].employees) {
            console.log("EMPLOYEES", oldTeam[0].employees);
            await Promise.all(
              oldTeam[0].employees.map(async employeeid =>
                createNotification({
                  receiver: employeeid,
                  message: `A Team is deleted`,
                  icon: "users",
                  link: "teammanger",
                  changed: ["ownLicences"]
                })
              )
            );
          }

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateTeamPic: requiresRights(["edit-team"]).createResolver(
    async (_p, { file, teamid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
            user: { company }
          } = decode(session.token);

          const oldUnit = await models.Unit.findOne({
            where: { id: teamid },
            raw: true
          });

          await teamCheck(company, teamid);

          const parsedFile = await file;

          if (oldUnit.profilepicture) {
            await deleteUserImage(oldUnit.profilepicture);
          }

          const profilepicture = await uploadTeamImage(
            parsedFile,
            teamPicFolder
          );

          const updatedUnit = await models.Unit.update(
            { profilepicture },
            { where: { id: teamid }, returning: true, transaction: ta }
          );

          const p1 = models.Team.findOne({
            where: { unitid: teamid },
            raw: true,
            transaction: ta
          });

          const p2 = createLog(
            ctx,
            "updateTeamPic",
            { oldUnit, updatedUnit: updatedUnit[1] },
            ta
          );

          const [team] = await Promise.all([p1, p2]);

          return { ...team, profilepicture };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  addOrbitToTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, orbitid, assignments }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(ctx.session.token);

          const { models, session } = ctx;

          await teamCheck(company, teamid);

          await checkOrbitMembership(models, company, orbitid);

          // Add as Teamorbit (DepartmentApp)

          await models.DepartmentApp.create(
            { departmentid: teamid, boughtplanid: orbitid },
            { transaction: ta }
          );

          const promises = [];

          assignments.forEach(a => {
            promises.push(
              checkCompanyMembership(models, company, a.employeeid, "employee")
            );

            promises.push(
              models.LicenceRight.create(
                {
                  view: true,
                  use: true,
                  tags: ["teamlicence"],
                  licenceid: a.accountid,
                  unitid: a.employeeid,
                  options: { teamlicence: teamid }
                },
                ta
              )
            );
          });

          await Promise.all(promises);

          const employeeNotifypromises = [];
          assignments.forEach(a =>
            employeeNotifypromises.push(
              createNotification({
                receiver: a.employeeid,
                message: `An orbit has been added to a team`,
                icon: "plus-circle",
                link: "teammanger",
                changed: ["ownLicences"]
              })
            )
          );

          await Promise.all(employeeNotifypromises);

          // await createLog(ctx, "addServiceToTeam", { teamid, serviceid }, ta);

          const team = await models.sequelize.query(
            `SELECT * FROM team_view WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta
            }
          );

          await createLog(
            ctx,
            "addOrbitToTeam",
            {
              teamid,
              orbitid,
              assignments,
              team
            },
            ta
          );
          return team && team[0];
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  addMemberToTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, employeeid, assignments }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(ctx.session.token);

          const { models, session } = ctx;

          await teamCheck(company, teamid);

          await checkCompanyMembership(models, company, employeeid, "Employee");

          await models.ParentUnit.create(
            { parentunit: teamid, childunit: employeeid },
            { transaction: ta }
          );

          const promises = [];

          assignments.forEach(a => {
            promises.push(checkOrbitMembership(models, company, a.orbitid));

            promises.push(
              models.LicenceRight.create(
                {
                  view: true,
                  use: true,
                  tags: ["teamlicence"],
                  licenceid: a.accountid,
                  unitid: employeeid,
                  options: { teamlicence: teamid }
                },
                ta
              )
            );
          });

          await Promise.all(promises);

          await createNotification({
            receiver: employeeid,
            message: `Someone has been added to a team`,
            icon: "plus-circle",
            link: "teammanger",
            changed: ["ownLicences"]
          });

          // await createLog(ctx, "addServiceToTeam", { teamid, serviceid }, ta);

          const team = await models.sequelize.query(
            `SELECT * FROM team_view WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta
            }
          );

          await createLog(
            ctx,
            "addMemberToTeam",
            {
              teamid,
              employeeid,
              assignments,
              team
            },
            ta
          );

          return team && team[0];
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  removeTeamOrbitFromTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, orbitid, deletejson, endtime }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(ctx.session.token);

          const { models, session } = ctx;

          await teamCheck(company, teamid);

          await checkOrbitMembership(models, company, orbitid);

          const promises = [];

          // Delete all team-orbit-assignments
          deletejson.teams.forEach(t => {
            if (t.bool) {
              promises.push(
                models.DepartmentApp.update(
                  { endtime: endtime || new Date() },
                  {
                    where: {
                      departmentid: t.id,
                      boughtplanid: orbitid,
                      endtime: Infinity
                    },
                    transaction: ta
                  }
                )
              );
            }
          });

          // Delete all accounts
          let noAccountLeft = true;
          deletejson.accounts.forEach(a => {
            // Delete all assignments of a
            Promise.all(
              a.assignments.map(async as => {
                if (as.bool) {
                  promises.push(
                    models.LicenceRight.update(
                      {
                        endtime
                      },
                      {
                        where: { id: as.id },
                        transaction: ta
                      }
                    )
                  );
                } else {
                  // Remove team tag and assignoption
                  const checkassignment = await models.LicenceRight.findOne({
                    where: { id: as.id },
                    raw: true,
                    transaction: ta
                  });
                  if (
                    checkassignment.tags &&
                    checkassignment.tags.includes("teamlicence") &&
                    checkassignment.options &&
                    checkassignment.options.teamlicence == teamid
                  ) {
                    let newtags = checkassignment.tags;
                    newtags.splice(
                      checkassignment.tags.findIndex(e => e == "teamlicence"),
                      1
                    );
                    promises.push(
                      models.LicenceRight.update(
                        {
                          tags: newtags,
                          options: {
                            ...checkassignment.options,
                            teamlicence: undefined
                          }
                        },
                        {
                          where: { id: as.id },
                          transaction: ta
                        }
                      )
                    );
                  }
                }
              })
            );

            if (a.bool && a.assignments.every(as => as.bool)) {
              promises.push(
                models.LicenceData.update(
                  {
                    endtime
                  },
                  {
                    where: { id: a.id },
                    transaction: ta
                  }
                )
              );
            } else {
              noAccountLeft = false;
            }
          });

          if (
            deletejson.orbit &&
            deletejson.teams.every(t => t.bool) &&
            noAccountLeft
          ) {
            promises.push(
              models.BoughtPlan.update(
                {
                  endtime
                },
                { where: { id: orbitid }, transaction: ta }
              )
            );
          }
          await Promise.all(promises);

          const team = await models.sequelize.query(
            `SELECT * FROM team_view WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta
            }
          );

          await createNotification({
            receiver: unitid,
            message: `You have removed an team orbit`,
            icon: "user-friends",
            link: "teammanager",
            changed: ["ownTeams", "ownLicences"]
          });

          await createLog(
            ctx,
            "removeTeamOrbitFromTeam",
            {
              teamid,
              orbitid,
              deletejson,
              endtime,
              team
            },
            ta
          );
          return team && team[0];
        } catch (err) {
          console.log("ERROR", err);
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  removeMemberFromTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, userid, deletejson, endtime }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(ctx.session.token);

          const { models, session } = ctx;

          await teamCheck(company, teamid);

          const promises = [];

          console.log("INPUTS", teamid, userid, deletejson, endtime);

          // Delete all assignments of as
          await Promise.all(
            deletejson.assignments.map(async as => {
              if (as.bool) {
                promises.push(
                  models.LicenceRight.update(
                    {
                      endtime
                    },
                    {
                      where: { id: as.id },
                      transaction: ta
                    }
                  )
                );
              } else {
                // Remove team tag and assignoption
                const checkassignment = await models.LicenceRight.findOne({
                  where: { id: as.id },
                  raw: true,
                  transaction: ta
                });
                if (
                  checkassignment.tags &&
                  checkassignment.tags.includes("teamlicence") &&
                  checkassignment.options &&
                  checkassignment.options.teamlicence == teamid
                ) {
                  promises.push(
                    models.LicenceRight.update(
                      {
                        tags: checkassignment.tags.splice(
                          checkassignment.tags.findIndex(
                            e => e == "teamlicence"
                          ),
                          1
                        ),
                        options: {
                          ...checkassignment.options,
                          teamlicence: undefined
                        }
                      },
                      {
                        where: { id: as.id },
                        transaction: ta
                      }
                    )
                  );
                }
              }
            })
          );
          await Promise.all(promises);

          //Check for other assignments
          if (deletejson.autodelete) {
            await Promise.all(
              deletejson.assignments.map(async asa => {
                const licenceRight = await models.LicenceRight.findOne({
                  where: { id: asa.id },
                  raw: true,
                  transaction: ta
                });

                console.log("LR", licenceRight);

                const licences = await models.sequelize.query(
                  `SELECT * FROM licence_view WHERE id = :licenceid and endtime > now() or endtime is null`,
                  {
                    replacements: { licenceid: licenceRight.licenceid },
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction: ta
                  }
                );

                console.log("LICENCES", licences);
                if (licences.length == 0) {
                  await models.LicenceData.update(
                    {
                      endtime
                    },
                    {
                      where: { id: licenceRight.licenceid },
                      transaction: ta
                    }
                  );

                  const otherlicences = await models.sequelize.query(
                    `Select distinct (lva.*)
                    from licence_view lva left outer join licence_view lvb on lva.boughtplanid = lvb.boughtplanid
                    where lvb.id = :licenceid and lva.starttime < now() and lva.endtime > now();`,
                    {
                      replacements: { licenceid: licenceRight.licenceid },
                      type: models.sequelize.QueryTypes.SELECT,
                      transaction: ta
                    }
                  );

                  console.log(otherlicences);

                  if (otherlicences.length == 0) {
                    const boughtplan = await models.sequelize.query(
                      `SELECT boughtplanid FROM licence_view WHERE id = :licenceid`,
                      {
                        replacements: { licenceid: licenceRight.licenceid },
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction: ta
                      }
                    );

                    console.log("BOUGHTPLAN", boughtplan);

                    await models.BoughtPlan.update(
                      {
                        endtime
                      },
                      {
                        where: { id: boughtplan[0].boughtplanid },
                        transaction: ta
                      }
                    );
                  }
                }
              })
            );
          }

          await models.ParentUnit.destroy({
            where: { parentunit: teamid, childunit: userid },
            transaction: ta
          });

          const team = await models.sequelize.query(
            `SELECT * FROM team_view WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta
            }
          );
          await createLog(
            ctx,
            "removeMemberFromTeam",
            {
              teamid,
              userid,
              deletejson,
              endtime,
              team
            },
            ta
          );
          return team && team[0];
        } catch (err) {
          console.log("ERROR", err);
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  )
};
