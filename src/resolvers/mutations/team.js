import { decode } from "jsonwebtoken";
import moment from "moment";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createLog, teamCheck, companyCheck } from "../../helpers/functions";
import { checkPlanValidity } from "../../helpers/functions";
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

  deleteTeam: requiresRights(["delete-team"]).createResolver(
    async (parent, { teamid }, { models, token, ip }) =>
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
          const p14 = models.DepartmentApp.destroy(
            { where: { departmentid: teamid } },
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

          await Promise.all([p7, p8, p9, p10, p11, p12, p13, p14]);

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

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

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

            await models.Licence.update(
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
              if (!keepLicences.find(l => l == serviceid)) {
                promises.push(
                  models.Licence.update(
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
      { teamid, serviceid, keepLicences },
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
                  models.Licence.update(
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
                promises.push(
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
          }
          await Promise.all(promises);

          await models.DepartmentApp.destroy(
            { where: { departmentid: teamid, boughtplanid: serviceid } },
            { transaction: ta }
          );

          await createLog(
            ip,
            "removeServiceFromTeam",
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
  ),

  addToTeam: requiresRights(["edit-team"]).createResolver(
    async (parent, addInformation, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const { teamid, services, userid } = addInformation;

          await teamCheck(company, teamid);

          //Nutzer add to team

          await models.ParentUnit.create(
            { parentunit: teamid, childunit: userid },
            { transaction: ta }
          );

          //Lizenzen aufsetzen
          const promises = [];

          services.forEach(service =>
            promises.push(
              models.Licence.create(
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
              models.Licence.create(
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

          //TODO notfiy user

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
