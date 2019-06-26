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

export default {
  addTeam: requiresRights(["create-team"]).createResolver(
    async (parent, { name, data }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

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

          await createLog(
            ip,
            "addTeam",
            { unit, department, parentUnit },
            unitid,
            ta
          );

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
    async (parent, { team, addemployees, apps }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

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

          console.log("before", addemployees);

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

              console.log("Created Human", userid);

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

          console.log("after", addemployees);

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
              console.log("CREATE LICENCE", employee, service);
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

          await createLog(
            ip,
            "addTeam",
            { unit, department, parentUnit },
            unitid,
            ta
          );

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
    async (_, { teamid, keepLicences }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

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
              ip,
              "deleteTeam - Image",
              { pic: oldUnit.profilepicture },
              unitid,
              ta
            );
          }

          await Promise.all([p7, p8, p9, p10, p11, p12, p13]);

          await createLog(
            ip,
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
            unitid,
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

  // TODO Remove?
  updateTeamMembers: requiresRights(["edit-team"]).createResolver(
    async (parent, { members, teamid, action }, { models, token, ip }) => {
      try {
        await models.sequelize.transaction(async ta => {
          try {
            const {
              user: { unitid, company }
            } = decode(token);

            await teamCheck(company, teamid);

            const promises = [];

            members.forEach(member => {
              promises.push(companyCheck(company, unitid, member));

              if (action == "ADD") {
                promises.push(
                  models.ParentUnit.create(
                    { parentunit: teamid, childunit: member },
                    { transaction: ta }
                  )
                );
              } else {
                promises.push(
                  models.ParentUnit.destroy(
                    { where: { parentunit: teamid, childunit: member } },
                    { transaction: ta }
                  )
                );
              }
            });

            await Promise.all(promises);

            await createLog(
              ip,
              "updateTeamMembers",
              { members, teamid, action },
              unitid,
              ta
            );
          } catch (err) {
            throw new Error(err);
          }
        });

        return models.Department.findOne({ where: { unitid: teamid } });
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  ),
  // TODO Remove?
  updateTeamInfos: requiresRights(["edit-team"]).createResolver(
    async (parent, { teamid, data }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          await teamCheck(company, teamid);

          const team = await models.DepartmentData.findOne({
            where: { unitid: teamid },
            transaction: ta,
            raw: true
          });

          await models.DepartmentData.update(
            { internaldata: { ...team.internaldata, ...data } },
            { where: { unitid: teamid }, transaction: ta }
          );

          await createLog(
            ip,
            "updateTeamInfos",
            { data, teamid, oldData: team.internaldata },
            unitid,
            ta
          );

          return { ...team, internaldata: { ...team.internaldata, ...data } };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateTeamPic: requiresRights(["edit-team"]).createResolver(
    async (_, { file, teamid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const oldUnit = await models.Unit.findOne({
            where: { id: teamid },
            raw: true
          });

          await teamCheck(company, teamid);

          const parsedFile = await file;
          await deleteUserImage(oldUnit.profilepicture);

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
            ip,
            "updateTeamPic",
            { oldUnit, updatedUnit: updatedUnit[1] },
            unitid,
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
  // TODO implement to work
  addTeamLicence: requiresRights(["edit-team"]).createResolver(
    async (parent, { teamid, boughtplanid }, { models, token, ip }) => {
      try {
        await models.sequelize.transaction(async ta => {
          try {
            const {
              user: { unitid, company }
            } = decode(token);

            await teamCheck(company, teamid);

            const licence = models.Licence.findOne({
              where: { boughtplanid },
              raw: true,
              transaction: ta
            });

            if (!licence) {
              throw new Error({
                code: 1,
                message: "There are no open licences left for this plan."
              });
            }

            await models.LicenceData.update(
              { unitid: teamid },
              { transaction: ta }
            );

            await createLog(
              ip,
              "addTeamLicence",
              { teamid, boughtplanid, licence },
              unitid,
              ta
            );
          } catch (err) {
            throw new Error(err);
          }
        });

        return models.Department.findOne({ where: { unitid: teamid } });
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  ),

  removeFromTeam: requiresRights(["edit-team"]).createResolver(
    async (parent, { teamid, userid, keepLicences }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

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
          if (team[0] && team[0].services) {
            team[0].services.forEach(serviceid => {
              if (keepLicences && !keepLicences.find(l => l == serviceid)) {
                promises.push(
                  models.LicenceData.update(
                    { endtime: moment().valueOf() },
                    {
                      where: {
                        boughtplanid: serviceid,
                        endtime: null,
                        unitid: userid,
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
                     where boughtplanid = :serviceid
                     and endtime is null
                     and unitid = :userid
                     and options ->> 'teamlicence' = :teamid`,
                    {
                      replacements: { serviceid, userid, teamid },
                      type: models.sequelize.QueryTypes.SELECT
                    }
                  )
                );
              }
            });
          }
          await Promise.all(promises);

          await models.ParentUnit.destroy(
            { where: { parentunit: teamid, childunit: userid } },
            { transaction: ta }
          );

          await createLog(
            ip,
            "removeEmployeeFromTeam",
            { teamid, userid },
            unitid,
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
    async (
      parent,
      { teamid, boughtplanid, keepLicences },
      { models, token, ip }
    ) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          await teamCheck(company, teamid);

          //Destroy all licences except the ones that they want to keep

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
              if (!keepLicences.find(l => l == employeeid)) {
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
            ip,
            "removeServiceFromTeam",
            { teamid, boughtplanid },
            unitid,
            ta
          );

          if (team[0] && team[0].employees) {
            const employeeNotifypromises = [];
            team[0].employees.forEach(employee =>
              employeeNotifypromises.push(
                createNotification({
                  receiver: employee.id,
                  message: `A service has been removed from a team`,
                  icon: "minus-circle",
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

  addToTeam: requiresRights(["edit-team"]).createResolver(
    async (parent, addInformation, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          console.log("addInformation", addInformation);
          const {
            user: { unitid, company }
          } = decode(token);

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

          //User add to team

          await models.ParentUnit.create(
            { parentunit: teamid, childunit: userid },
            { transaction: ta }
          );

          //Lizenzen aufsetzen
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

          //TODO notfiy user

          await createLog(
            ip,
            "addEmployeeFromTeam",
            { teamid, userid },
            unitid,
            ta
          );

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
          throw new Error(err);
        }
      })
  ),

  addEmployeeToTeam: requiresRights(["edit-team"]).createResolver(
    async (parent, { teamid, employeeid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          await teamCheck(company, teamid);

          //User add to team

          await models.ParentUnit.create(
            { parentunit: teamid, childunit: employeeid },
            { transaction: ta }
          );

          await createLog(
            ip,
            "addEmployeeFromTeam",
            { teamid, employeeid },
            unitid,
            ta
          );

          return true;
        } catch (err) {
          throw new Error(err);
        }
      })
  ),

  addAppToTeam: requiresRights(["edit-team"]).createResolver(
    async (parent, addInformation, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const { teamid, employees, serviceid } = addInformation;

          //await teamCheck(company, teamid); Maybe implement in loop again

          //Nutzer add to team

          const app = await models.Plan.findOne({
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
          console.log("BEFORE CHECK", plan);
          await checkPlanValidity(plan);
          console.log("AFTER CHECK", plan);

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

          //Lizenzen aufsetzen
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

          await createLog(
            ip,
            "addServiceToTeam",
            { teamid, serviceid },
            unitid,
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
  )
};
