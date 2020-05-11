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
  formatHumanName,
} from "../../helpers/functions";
import { uploadTeamImage, deleteUserImage } from "../../services/aws";
import {
  checkOrbitMembership,
  checkCompanyMembership,
} from "../../helpers/companyMembership";

export default {
  createTeam: requiresRights(["create-team"]).createResolver(
    async (_p, { team, addemployees, apps }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { unitid, company },
          } = decode(session.token);

          const { name, profilepicture, ...teamdata } = team;
          const unitArgs = {};
          if (profilepicture) {
            const parsedFile = await profilepicture;

            const pic = await uploadTeamImage(parsedFile, teamPicFolder);

            unitArgs.profilepicture = pic;
          }

          const unit = await models.Unit.create(unitArgs, { transaction: ta });

          const p1 = models.DepartmentData.create(
            {
              unitid: unit.dataValues.id,
              name,
              internaldata: { created: Date.now(), ...teamdata },
            },
            { transaction: ta }
          );

          const p2 = models.ParentUnit.create(
            { parentunit: company, childunit: unit.dataValues.id },
            { transaction: ta }
          );

          const [department, parentUnit] = await Promise.all([p1, p2]);

          await createNotification(
            {
              receiver: unitid,
              message: `User ${unitid} has created Team ${unit.dataValues.id}`,
              icon: "users",
              link: "teammanger",
              changed: ["companyTeams"],
            },
            ta,
            { company }
          );

          return unit.dataValues.id;
        } catch (err) {
          console.error("\x1b[1m%s\x1b[0m", "LOG err", err);
          throw new NormalError({
            message: err.message,
            internalData: { err },
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
            user: { unitid, company },
          } = decode(session.token);

          await teamCheck(company, teamid);

          const oldTeam = await models.sequelize.query(
            `SELECT * FROM team_view WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta,
            }
          );

          await createNotification(
            {
              message: `User ${unitid} has deleted Team ${teamid}`,
              icon: "users",
              link: "teammanger",
              changed: [
                "companyTeams",
                "ownLicences",
                "ownTeams",
                "semiPublicUser",
              ],
            },
            ta,
            { company, level: 2 },
            { teamid, level: 3 }
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
                          endtime,
                        },
                        {
                          where: { id: as.id },
                          transaction: ta,
                        }
                      )
                    );
                  } else {
                    // Remove team tag and assignoption
                    const checkassignment = await models.LicenceRight.findOne({
                      where: { id: as.id },
                      raw: true,
                      transaction: ta,
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
                              teamlicence: undefined,
                            },
                          },
                          {
                            where: { id: as.id },
                            transaction: ta,
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
                      transaction: ta,
                    });

                    const licences = await models.sequelize.query(
                      `SELECT * FROM licence_view WHERE id = :licenceid and endtime > now() or endtime is null`,
                      {
                        replacements: { licenceid: licenceRight.licenceid },
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction: ta,
                      }
                    );

                    if (licences.length == 0) {
                      await models.LicenceData.update(
                        {
                          endtime,
                        },
                        {
                          where: { id: licenceRight.licenceid },
                          transaction: ta,
                        }
                      );

                      const otherlicences = await models.sequelize.query(
                        `Select distinct (lva.*)
                    from licence_view lva left outer join licence_view lvb on lva.boughtplanid = lvb.boughtplanid
                    where lvb.id = :licenceid and lva.starttime < now() and lva.endtime > now();`,
                        {
                          replacements: { licenceid: licenceRight.licenceid },
                          type: models.sequelize.QueryTypes.SELECT,
                          transaction: ta,
                        }
                      );

                      if (otherlicences.length == 0) {
                        const boughtplan = await models.sequelize.query(
                          `SELECT boughtplanid FROM licence_view WHERE id = :licenceid`,
                          {
                            replacements: { licenceid: licenceRight.licenceid },
                            type: models.sequelize.QueryTypes.SELECT,
                            transaction: ta,
                          }
                        );

                        await models.BoughtPlanPeriod.update(
                          {
                            endtime,
                          },
                          {
                            where: { boughtplanid: boughtplan[0].boughtplanid },
                            transaction: ta,
                          }
                        );
                      }
                    }
                  })
                );
              }

              await models.ParentUnit.destroy({
                where: { parentunit: teamid, childunit: userid },
                transaction: ta,
              });

              //END ONE EMPLOYEE DELETED
            })
          );

          //End TeamOrbits

          const deletePromises = [];

          deletePromises.push(
            models.DepartmentApp.update(
              {
                endtime,
              },
              {
                where: { departmentid: teamid, endtime: Infinity },
                transaction: ta,
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
                [models.Op.or]: [{ childunit: teamid }, { parentunit: teamid }],
              },
              transaction: ta,
            })
          );

          await Promise.all(deletePromises);

          await createLog(
            ctx,
            "deleteTeam",
            {
              teamid,
              deletejson,
            },
            ta
          );

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
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
            user: { company },
          } = decode(session.token);

          const oldUnit = await models.Unit.findOne({
            where: { id: teamid },
            raw: true,
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
            transaction: ta,
          });

          const p2 = createLog(
            ctx,
            "updateTeamPic",
            { oldUnit, updatedUnit: updatedUnit[1] },
            ta
          );

          const [team] = await Promise.all([p1, p2]);

          await createNotification(
            {
              message: `User ${unitid} has updated the image of Team ${teamid}`,
              icon: "plus-circle",
              link: "teammanger",
              changed: ["ownTeams", "companyTeams"],
            },
            ta,
            { company, level: 1 },
            { teamid }
          );

          return { ...team, profilepicture };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  addOrbitToTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, orbitid, assignments }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
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
                  options: { teamlicence: teamid },
                },
                ta
              )
            );
          });

          await Promise.all(promises);

          await createNotification(
            {
              message: `User ${unitid} has added Orbit ${orbitid} to Team ${teamid}`,
              icon: "plus-circle",
              link: "teammanger",
              changed: [
                "companyServices",
                "semiPublicUser",
                "companyTeams",
                "ownLicences",
              ],
            },
            ta,
            { company },
            { teamid, level: 3 }
          );
          const team = await models.sequelize.query(
            `SELECT * FROM team_view WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta,
            }
          );

          await createLog(
            ctx,
            "addOrbitToTeam",
            {
              teamid,
              orbitid,
              assignments,
              team,
            },
            ta
          );
          return team && team[0];
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  addMemberToTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, employeeid, assignments }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
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
                  options: { teamlicence: teamid },
                },
                ta
              )
            );
          });

          await Promise.all(promises);

          await createNotification(
            {
              receiver: employeeid,
              message: `User ${unitid} has add User ${employeeid} to Team ${teamid}`,
              icon: "plus-circle",
              link: "teammanger",
              changed: ["ownLicences", "ownTeams", "semiPublicUser"],
              level: 3,
            },
            ta,
            { company },
            { teamid }
          );

          // await createLog(ctx, "addServiceToTeam", { teamid, serviceid }, ta);

          const team = await models.sequelize.query(
            `SELECT * FROM team_view WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta,
            }
          );

          await createLog(
            ctx,
            "addMemberToTeam",
            {
              teamid,
              employeeid,
              assignments,
              team,
            },
            ta
          );

          return team && team[0];
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  removeTeamOrbitFromTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, orbitid, deletejson, endtime }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
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
                      endtime: Infinity,
                    },
                    transaction: ta,
                  }
                )
              );
            }
          });

          // Delete all accounts
          let noAccountLeft = true;
          deletejson.accounts.forEach(a => {
            if (a) {
              // Delete all assignments of a
              Promise.all(
                a.assignments.map(async as => {
                  if (as.bool) {
                    promises.push(
                      models.LicenceRight.update(
                        {
                          endtime: endtime || new Date(),
                        },
                        {
                          where: { id: as.id },
                          transaction: ta,
                        }
                      )
                    );
                  } else {
                    // Remove team tag and assignoption
                    const checkassignment = await models.LicenceRight.findOne({
                      where: { id: as.id },
                      raw: true,
                      transaction: ta,
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
                              teamlicence: undefined,
                            },
                          },
                          {
                            where: { id: as.id },
                            transaction: ta,
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
                      endtime: endtime || new Date(),
                    },
                    {
                      where: { id: a.id },
                      transaction: ta,
                    }
                  )
                );
              } else {
                noAccountLeft = false;
              }
            }
          });

          if (
            deletejson.orbit &&
            deletejson.teams.every(t => t && t.bool) &&
            noAccountLeft
          ) {
            promises.push(
              models.BoughtPlanPeriod.update(
                {
                  endtime: endtime || new Date(),
                },
                { where: { boughtplanid: orbitid }, transaction: ta }
              )
            );
          }
          await Promise.all(promises);

          const team = await models.sequelize.query(
            `SELECT * FROM team_view WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta,
            }
          );

          await createNotification(
            {
              message: `User ${unitid} has removed Orbit ${orbitid} from Team ${teamid}`,
              icon: "user-friends",
              link: "teammanager",
              changed: ["ownTeams", "ownLicences"],
            },
            ta,
            { company },
            { teamid, level: 3 }
          );

          await createLog(
            ctx,
            "removeTeamOrbitFromTeam",
            {
              teamid,
              orbitid,
              deletejson,
              endtime,
              team,
            },
            ta
          );
          return team && team[0];
        } catch (err) {
          console.log("ERROR", err);
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  removeMemberFromTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, userid, deletejson, endtime }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(ctx.session.token);

          const { models, session } = ctx;

          await teamCheck(company, teamid);

          const promises = [];

          // Delete all assignments of as
          await Promise.all(
            deletejson.assignments.map(async as => {
              if (as.bool) {
                promises.push(
                  models.LicenceRight.update(
                    {
                      endtime,
                    },
                    {
                      where: { id: as.id },
                      transaction: ta,
                    }
                  )
                );
              } else {
                // Remove team tag and assignoption
                const checkassignment = await models.LicenceRight.findOne({
                  where: { id: as.id },
                  raw: true,
                  transaction: ta,
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
                          teamlicence: undefined,
                        },
                      },
                      {
                        where: { id: as.id },
                        transaction: ta,
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
                  transaction: ta,
                });

                const licences = await models.sequelize.query(
                  `SELECT * FROM licence_view WHERE id = :licenceid and endtime > now() or endtime is null`,
                  {
                    replacements: { licenceid: licenceRight.licenceid },
                    type: models.sequelize.QueryTypes.SELECT,
                    transaction: ta,
                  }
                );

                if (licences.length == 0) {
                  await models.LicenceData.update(
                    {
                      endtime,
                    },
                    {
                      where: { id: licenceRight.licenceid },
                      transaction: ta,
                    }
                  );

                  const otherlicences = await models.sequelize.query(
                    `Select distinct (lva.*)
                    from licence_view lva left outer join licence_view lvb on lva.boughtplanid = lvb.boughtplanid
                    where lvb.id = :licenceid and lva.starttime < now() and lva.endtime > now();`,
                    {
                      replacements: { licenceid: licenceRight.licenceid },
                      type: models.sequelize.QueryTypes.SELECT,
                      transaction: ta,
                    }
                  );

                  if (otherlicences.length == 0) {
                    const boughtplan = await models.sequelize.query(
                      `SELECT boughtplanid FROM licence_view WHERE id = :licenceid`,
                      {
                        replacements: { licenceid: licenceRight.licenceid },
                        type: models.sequelize.QueryTypes.SELECT,
                        transaction: ta,
                      }
                    );

                    await models.BoughtPlanPeriod.update(
                      {
                        endtime,
                      },
                      {
                        where: { boughtplanid: boughtplan[0].boughtplanid },
                        transaction: ta,
                      }
                    );

                    await models.DepartmentApp.update(
                      { endtime },
                      {
                        where: {
                          departmentid: licenceRight.options.teamlicence,
                          boughtplanid: boughtplan[0].boughtplanid,
                          endtime: Infinity,
                        },
                        transaction: ta,
                      }
                    );
                  }
                }
              })
            );
          }

          await models.ParentUnit.destroy({
            where: { parentunit: teamid, childunit: userid },
            transaction: ta,
          });
          await createNotification(
            {
              receiver: userid,
              message: `User ${unitid} has removed User ${userid} from Team ${teamid}`,
              icon: "user-friends",
              link: "teammanager",
              changed: ["ownTeams", "ownLicences"],
              level: 3,
            },
            ta,
            { company },
            { teamid }
          );

          const team = await models.sequelize.query(
            `SELECT * FROM team_view WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT,
              transaction: ta,
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
              team,
            },
            ta
          );
          return team && team[0];
        } catch (err) {
          console.log("ERROR", err);
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),
};
