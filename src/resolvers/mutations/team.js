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
  addTeam: requiresRights(["create-team"]).createResolver(
    async (_p, { name, data }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
            user: { company }
          } = decode(session.token);

          const unit = await models.Unit.create({}, { transaction: ta });

          const p1 = models.DepartmentData.create(
            {
              unitid: unit.dataValues.id,
              name,
              internaldata: { created: Date.now(), ...data }
            },
            { transaction: ta }
          );

          const p2 = models.ParentUnit.create(
            { parentunit: company, childunit: unit.dataValues.id },
            { transaction: ta }
          );

          const [department, parentUnit] = await Promise.all([p1, p2]);

          await createLog(ctx, "addTeam", { unit, department, parentUnit }, ta);

          return department;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

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
    async (_, { teamid, keepLicences }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
            user: { company }
          } = decode(session.token);

          await teamCheck(company, teamid);

          const options = { transaction: ta, raw: true };

          const findOptions = { where: { unitid: teamid }, ...options };

          const what = { where: { unitid: teamid } };

          const p1 = models.Unit.findOne({ where: { id: teamid }, ...options });
          const p2 = models.DepartmentData.findOne(findOptions);
          const p3 = models.Email.findOne(findOptions);
          const p4 = models.Address.findOne(findOptions);
          const p5 = models.Phone.findOne(findOptions);
          const p6 = models.ParentUnit.findOne({
            where: {
              [models.Op.or]: [{ childunit: teamid }, { parentunit: teamid }]
            },
            transaction: ta
          });
          const p7 = models.DepartmentApp.findOne({
            where: { departmentid: teamid },
            transaction: ta
          });

          // Keep Licences

          const team = await models.sequelize.query(
            `SELECT employees, services FROM team_view 
            WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT
            }
          );
          const licencesPromises = [];
          if (team[0] && team[0].services) {
            team[0].services.forEach(serviceid => {
              team[0].employees.forEach(employeeid => {
                if (
                  !keepLicences.find(
                    l => l.service == serviceid && l.employee == employeeid
                  )
                ) {
                  licencesPromises.push(
                    models.LicenceData.update(
                      { endtime: moment().valueOf() },
                      {
                        where: {
                          boughtplanid: serviceid,
                          endtime: null,
                          unitid: employeeid,
                          options: { teamlicence: teamid }
                        },
                        transaction: ta
                      }
                    )
                  );
                } else {
                  licencesPromises.push(
                    models.sequelize.query(
                      `Update licence_data set options = options - 'teamlicence'
                      where boughtplanid = :serviceid
                      and endtime is null
                      and unitid = :employeeid
                      and options ->> 'teamlicence' = :teamid`,
                      {
                        replacements: { serviceid, employeeid, teamid },
                        type: models.sequelize.QueryTypes.SELECT
                      }
                    )
                  );
                }
              });
            });
          }
          await Promise.all(licencesPromises);

          await models.DepartmentApp.destroy(
            { where: { departmentid: teamid } },
            { transaction: ta }
          );
          const p8 = models.Unit.update(
            { deleted: true },
            { where: { id: teamid }, transaction: ta }
          );
          const p9 = models.DepartmentData.destroy(what, { transaction: ta });
          const p10 = models.Email.destroy(what, { transaction: ta });
          const p11 = models.Address.destroy(what, { transaction: ta });
          const p12 = models.Phone.destroy(what, { transaction: ta });
          const p13 = models.ParentUnit.destroy(
            {
              where: {
                [models.Op.or]: [{ childunit: teamid }, { parentunit: teamid }]
              }
            },
            { transaction: ta }
          );

          const [
            oldUnit,
            oldDepartment,
            oldEmail,
            oldAddress,
            oldPhone,
            oldParentUnit,
            oldDepartmentApps
          ] = await Promise.all([p1, p2, p3, p4, p5, p6, p7]);

          try {
            await deleteUserImage(oldUnit.profilepicture);
          } catch (err) {
            await createLog(
              ctx,
              "deleteTeam - Image",
              { pic: oldUnit.profilepicture },
              ta
            );
          }

          await Promise.all([p7, p8, p9, p10, p11, p12, p13]);

          await createLog(
            ctx,
            "deleteTeam",
            {
              oldUnit,
              oldDepartment,
              oldEmail,
              oldAddress,
              oldPhone,
              oldParentUnit,
              oldDepartmentApps
            },
            ta
          );

          if (team[0] && team[0].employees) {
            const employeeNotifypromises = [];
            team[0].employees.forEach(employee =>
              employeeNotifypromises.push(
                createNotification({
                  receiver: employee.id,
                  message: `A Team is deleted`,
                  icon: "users",
                  link: "teammanger",
                  changed: ["ownLicences"]
                })
              )
            );

            await Promise.all(employeeNotifypromises);
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

  removeFromTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, userid, keepLicences }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
            user: { company }
          } = decode(session.token);

          await teamCheck(company, teamid);

          //Destroy all licences except the ones that they want to keep

          const team = await models.sequelize.query(
            `SELECT services FROM team_view 
            WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT
            }
          );
          const promises = [];
          console.log("TEAM", team[0]);
          if (team[0] && team[0].services) {
            team[0].services.forEach(serviceid => {
              if (keepLicences && keepLicences.find(l => l == serviceid)) {
                promises.push(
                  models.sequelize.query(
                    `Update licence_data l set options = options - 'teamlicence'
                     where l.boughtplanid = :serviceid
                     and l.endtime is null
                     and l.unitid = :userid
                     and l.options ->> 'teamlicence' = :teamid`,
                    {
                      replacements: { serviceid, userid, teamid },
                      type: models.sequelize.QueryTypes.SELECT
                    }
                  )
                );
              } else {
                promises.push(
                  models.sequelize.query(
                    `Update licence_data l set endtime = now()
                     where l.boughtplanid = :serviceid
                     and l.endtime is null
                     and l.unitid = :userid
                     and l.options ->> 'teamlicence' = :teamid`,
                    {
                      replacements: { serviceid, userid, teamid },
                      type: models.sequelize.QueryTypes.SELECT
                    }
                  )
                );
                /* promises.push(
                  models.sequelize.query(
                    `Update licence_data l set options = options - 'teamlicence'
                     l.boughtplanid = :serviceid`,
                    {
                      replacements: { serviceid },
                      type: models.sequelize.QueryTypes.SELECT
                    }
                  )
                ); */
              }
            });
          }
          await Promise.all(promises);

          await models.ParentUnit.destroy(
            { where: { parentunit: teamid, childunit: userid } },
            { transaction: ta }
          );

          await createLog(
            ctx,
            "removeEmployeeFromTeam",
            { teamid, userid },
            ta
          );

          await createNotification({
            receiver: userid,
            message: `You have been removed from a team`,
            icon: "user-minus",
            link: "teammanger",
            changed: ["ownLicences"]
          });

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  removeServiceFromTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, boughtplanid, keepLicences }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const keepLicencesSAVE = keepLicences || [];
          const { models, session } = ctx;
          const {
            user: { company }
          } = decode(session.token);

          await teamCheck(company, teamid);

          // Destroy all licences except the ones that they want to keep

          const team = await models.sequelize.query(
            `SELECT employees FROM team_view 
            WHERE unitid = :teamid`,
            {
              replacements: { teamid },
              type: models.sequelize.QueryTypes.SELECT
            }
          );
          const promises = [];
          if (team[0] && team[0].employees) {
            team[0].employees.forEach(employeeid => {
              if (!keepLicencesSAVE.find(l => l == employeeid)) {
                promises.push(
                  models.LicenceData.update(
                    { endtime: moment().valueOf() },
                    {
                      where: {
                        boughtplanid,
                        endtime: null,
                        unitid: employeeid,
                        options: { teamlicence: teamid }
                      },
                      transaction: ta
                    }
                  )
                );
              } else {
                promises.push(
                  models.sequelize.query(
                    `Update licence_data set options = options - 'teamlicence'
                     where boughtplanid = :boughtplanid
                     and endtime is null
                     and unitid = :employeeid
                     and options ->> 'teamlicence' = :teamid`,
                    {
                      replacements: { boughtplanid, employeeid, teamid },
                      type: models.sequelize.QueryTypes.SELECT
                    }
                  )
                );
              }
            });
          }
          await Promise.all(promises);

          await models.DepartmentApp.destroy(
            { where: { departmentid: teamid, boughtplanid } },
            { transaction: ta }
          );

          await createLog(
            ctx,
            "removeServiceFromTeam",
            { teamid, boughtplanid },
            ta
          );

          if (team[0] && team[0].employees) {
            const employeeNotifypromises = [];
            team[0].employees.forEach(employee => {
              employeeNotifypromises.push(
                createNotification({
                  receiver: employee,
                  message: `A service has been removed from a team`,
                  icon: "minus-circle",
                  link: "teammanger",
                  changed: ["ownLicences"]
                })
              );
            });

            await Promise.all(employeeNotifypromises);
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

  addToTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, addInformation, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { unitid, company }
          } = decode(session.token);

          let newEmployee = false;
          const { services, newEmployeeInfo, newteam } = addInformation;
          let { teamid, userid } = addInformation;

          await teamCheck(company, teamid);

          if (userid == "new") {
            newEmployee = true;
            userid = await createHuman(
              models,
              ta,
              company,
              newEmployeeInfo.name,
              newEmployeeInfo.password,
              newEmployeeInfo.wmail1,
              newEmployeeInfo.wmail2
            );
          }

          if (teamid == "new") {
            const { name, picture, ...teamdata } = newteam;
            const unitArgs = {};
            if (picture) {
              const parsedFile = await picture;

              const profilepicture = await uploadTeamImage(
                parsedFile,
                teamPicFolder
              );

              unitArgs.profilepicture = profilepicture;
            }
            const unit = await models.Unit.create(unitArgs, {
              transaction: ta
            });

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
            await Promise.all([p1, p2]);
            teamid = unit.dataValues.id;
          }

          // User add to team

          await models.ParentUnit.create(
            { parentunit: teamid, childunit: userid },
            { transaction: ta }
          );

          // Lizenzen aufsetzen
          const promises = [];

          services.forEach(service =>
            promises.push(
              models.LicenceData.create(
                {
                  unitid: userid,
                  disabled: false,
                  boughtplanid: service.id,
                  agreed: true,
                  key: {
                    email: service.setup.email,
                    password: service.setup.password,
                    subdomain: service.setup.subdomain,
                    external: true
                  },
                  options: service.setupfinished
                    ? {
                        teamlicence: teamid
                      }
                    : {
                        teamlicence: teamid,
                        nosetup: true
                      }
                },
                { transaction: ta }
              )
            )
          );

          await Promise.all(promises);

          await createLog(ctx, "addEmployeeFromTeam", { teamid, userid }, ta);

          await createNotification({
            receiver: userid,
            message: `You have been added to a team`,
            icon: "user-plus",
            link: "teammanger",
            changed: ["ownLicences"]
          });

          if (newEmployee) {
            const p1 = models.Human.findOne({ where: { unitid } });

            const p2 = models.DepartmentData.findOne({
              where: { unitid: company }
            });

            const [requester, companyObj] = await Promise.all([p1, p2]);
            await sendEmail({
              templateId: "d-e049cce50d20428d81f011e521605d4c",
              fromName: "VIPFY",
              personalizations: [
                {
                  to: [
                    {
                      email: newEmployeeInfo.wmail1,
                      name: newEmployeeInfo.name
                    }
                  ],
                  dynamic_template_data: {
                    name: newEmployeeInfo.name,
                    creator: formatHumanName(requester),
                    companyname: companyObj.name,
                    email: newEmployeeInfo.wmail1,
                    password: newEmployeeInfo.password
                  }
                }
              ]
            });

            await createNotification({
              receiver: unitid,
              message: `${addInformation.name} was successfully created`,
              icon: "user-plus",
              link: "employeemanager",
              changed: []
            });
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

  addEmployeeToTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, employeeid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
            user: { company }
          } = decode(session.token);

          await teamCheck(company, teamid);

          // User add to team

          await models.ParentUnit.create(
            { parentunit: teamid, childunit: employeeid },
            { transaction: ta }
          );

          await createLog(
            ctx,
            "addEmployeeFromTeam",
            { teamid, employeeid },
            ta
          );

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  addAppToTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, addInformation, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
            user: { unitid, company }
          } = decode(session.token);

          const { teamid, employees, serviceid } = addInformation;

          // await teamCheck(company, teamid); Maybe implement in loop again

          // Nutzer add to team

          const app = await models.App.findOne({
            where: { id: serviceid },
            raw: true
          });

          const plan = await models.Plan.findOne({
            where: { appid: serviceid, options: { external: true } },
            raw: true
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
            { departmentid: teamid, boughtplanid: boughtPlan.id },
            { transaction: ta }
          );

          // Lizenzen aufsetzen
          const promises = [];

          employees.forEach(employee =>
            promises.push(
              models.LicenceData.create(
                {
                  unitid: employee.id,
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
                        teamlicence: teamid
                      }
                    : {
                        teamlicence: teamid,
                        nosetup: true
                      }
                },
                { transaction: ta }
              )
            )
          );

          await Promise.all(promises);

          const employeeNotifypromises = [];
          employees.forEach(employee =>
            employeeNotifypromises.push(
              createNotification({
                receiver: employee.id,
                message: `A service has been added to a team`,
                icon: "plus-circle",
                link: "teammanger",
                changed: ["ownLicences"]
              })
            )
          );

          await Promise.all(employeeNotifypromises);

          await createLog(ctx, "addServiceToTeam", { teamid, serviceid }, ta);

          return boughtPlan.id;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  addOrbitToTeam: requiresRights(["edit-team"]).createResolver(
    async (_p, { teamid, orbitid, assignments }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);

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
                message: `A service has been added to a team`,
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
    async (_p, { teamid, employeeid, assignments }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);

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
            message: `A service has been added to a team`,
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
    async (_p, { teamid, orbitid, deletejson, endtime }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);

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
    async (_p, { teamid, userid, deletejson, endtime }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);

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
