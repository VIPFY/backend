import { decode } from "jsonwebtoken";
import moment from "moment";
import * as Services from "vipfy-services";
import { NormalError } from "../../errors";
import {
  requiresDepartmentCheck,
  requiresRight
} from "../../helpers/permissions";
import dd24Api from "../../services/dd24";
import { createLog } from "../../helpers/functions";

/* eslint-disable no-return-await */

export default {
  distributeLicenceToDepartment: requiresDepartmentCheck.createResolver(
    (
      parent,
      { departmentid, boughtplanid, licencetype },
      { models, token, ip }
    ) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const p1 = models.Licence.findAll({
            where: {
              unitid: null,
              endtime: {
                [models.Op.or]: {
                  [models.Op.eq]: null,
                  [models.Op.gt]: Date.now()
                }
              },
              options: {
                [models.Op.contains]: {
                  type: licencetype
                }
              },
              boughtplanid
            },
            raw: true
          });

          const p2 = models.sequelize.query(
            `SELECT DISTINCT employee FROM department_employee_view WHERE
            id = :departmentid and employee NOT IN (SELECT DISTINCT ld.unitid FROM licence_data
            AS ld INNER JOIN department_employee_view dev ON dev.employee = ld.unitid
            AND boughtplanid = :boughtplanid AND (ld.endtime IS NULL OR ld.endtime > NOW())
            AND ld.options @> :type AND ld.disabled = false AND dev.id = :departmentid)`,
            {
              replacements: {
                boughtplanid,
                departmentid,
                type: JSON.stringify({ type: licencetype })
              },
              type: models.sequelize.QueryTypes.SELECT
            }
          );

          const p3 = models.Right.findOne({
            where: {
              holder: unitid,
              forunit: departmentid,
              type: { [models.Op.or]: ["admin", "distributeapps"] }
            }
          });

          const p4 = models.BoughtPlan.findOne({
            where: { id: boughtplanid },
            raw: true,
            attributes: ["disabled", "endtime"]
          });

          const [
            openLicences,
            haveNoLicence,
            hasRight,
            validPlan
          ] = await Promise.all([p1, p2, p3, p4]);
          const employees = haveNoLicence.map(licence => licence.employee);

          if (openLicences.length == 0) {
            return {
              ok: false,
              error: {
                code: 1,
                message: "There are no licences to distribute for this plan."
              }
            };
          } else if (!hasRight && openLicences.length < employees.length) {
            return {
              ok: false,
              error: {
                code: 2,
                message: `There are ${employees.length -
                  openLicences.length} Licences missing for this department and you don't have the right to distribute them for this department.`
              }
            };
          } else if (hasRight && openLicences.length < employees.length) {
            return {
              ok: false,
              error: {
                code: 3,
                message: `There are ${employees.length -
                  openLicences.length} Licences missing for this department.`
              }
            };
          } else if (!hasRight) {
            return {
              ok: false,
              error: {
                code: 4,
                message: "You don't have the right to distribute licences."
              }
            };
          } else if (!validPlan || (validPlan && validPlan.disabled)) {
            return {
              ok: false,
              error: {
                code: 5,
                message: "The plan is disabled."
              }
            };
          } else if (
            validPlan &&
            validPlan.endtime &&
            validPlan.endtime < Date.now()
          ) {
            return {
              ok: false,
              error: {
                code: 6,
                message: "The plan expired."
              }
            };
          }

          const takeLicences = employees.map(
            async (employee, i) =>
              await models.Licence.update(
                {
                  unitid: employee
                },
                {
                  where: { id: openLicences[i].id, unitid: null },
                  raw: true,
                  transaction: ta
                }
              )
          );

          const takenLicences = await Promise.all(takeLicences);

          const p5 = models.DepartmentApp.create(
            { departmentid, boughtplanid },
            { transaction: ta }
          );

          const p6 = createLog(
            ip,
            "distributeLicenceToDepartment",
            { departmentid, boughtplanid, licencetype, takenLicences },
            unitid,
            ta
          );

          await Promise.all([p5, p6]);

          return { ok: true, error: null };
        } catch (err) {
          return {
            ok: false,
            error: {
              code: 0,
              message: err.message
            }
          };
        }
      })
  ),

  revokeLicencesFromDepartment: requiresRight([
    "distributelicences",
    "admin"
  ]).createResolver(
    (parent, { departmentid, boughtplanid }, { models, ip, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const p1 = models.sequelize.query(
            `SELECT * FROM licence_data WHERE unitid IN (SELECT
             employee FROM department_employee_view WHERE id = :departmentid) AND
             (endtime > NOW() OR endtime ISNULL) AND boughtplanid = :boughtplanid`,
            {
              replacements: { departmentid, boughtplanid },
              raw: true,
              transaction: ta
            }
          );

          const p2 = models.DepartmentApp.findOne(
            { where: { departmentid, boughtplanid } },
            { transaction: ta }
          );

          const [oldLicences, oldDepartment] = await Promise.all([p1, p2]);

          const p3 = models.DepartmentApp.destroy(
            { where: { departmentid, boughtplanid } },
            { transaction: ta }
          );

          const p4 = models.sequelize.query(
            `UPDATE licence_data SET unitid = null, agreed = false WHERE unitid IN (SELECT
             employee FROM department_employee_view WHERE id = :departmentid) AND
             (endtime > NOW() OR endtime ISNULL) AND boughtplanid = :boughtplanid RETURNING *`,
            {
              replacements: { departmentid, boughtplanid },
              raw: true,
              transaction: ta
            }
          );

          const revokedLicences = await Promise.all([p3, p4]);

          await createLog(
            ip,
            "revokeLicencesFromDepartment",
            { oldDepartment, oldLicences, revokedLicences: revokedLicences[1] },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  distributeLicence: requiresDepartmentCheck.createResolver(
    (parent, { boughtplanid, unitid, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid: giver }
          } = decode(token);

          const p1 = models.Licence.findOne({
            where: {
              unitid: null,
              boughtplanid,
              endtime: {
                [models.Op.or]: {
                  [models.Op.eq]: null,
                  [models.Op.lt]: Date.now()
                }
              }
            },
            raw: true
          });

          const p2 = models.Right.findOne({
            where: {
              holder: unitid,
              forunit: departmentid,
              type: { [models.Op.or]: ["admin", "distributeapps"] }
            }
          });

          const [openLicence, hasRight] = await Promise.all([p1, p2]);
          if (!openLicence) {
            return {
              ok: false,
              error: {
                code: 1,
                message:
                  "There are no open Licences to distribute for this plan!"
              }
            };
          } else if (!openLicence && !hasRight) {
            return {
              ok: false,
              error: {
                code: 2,
                message:
                  "There are no open Licences and you don't have the right to distribute!"
              }
            };
          } else if (!openLicence && hasRight) {
            return {
              ok: false,
              error: {
                code: 3,
                message: "There is no open Licence to distribute for this plan!"
              }
            };
          } else if (!hasRight) {
            return {
              ok: false,
              error: {
                code: 4,
                message: "You don't have the right to distribute Licences"
              }
            };
          }

          const p3 = models.Licence.update(
            {
              unitid
            },
            {
              where: { boughtplanid, unitid: null, id: openLicence.id },
              transaction: ta
            }
          );

          const p4 = models.BoughtPlan.findById(boughtplanid, {
            include: [models.Plan],
            raw: true,
            transaction: ta
          });

          const p5 = models.Human.findById(unitid, {
            transaction: ta
          });

          const [updatedLicence, boughtPlan, user] = Promise.all([p3, p4, p5]);

          // TODO: set email properly
          const inputUser = {
            id: unitid,
            firstname: user.firstname,
            middlename: user.middlename,
            lastname: user.lastname,
            rights: [],
            email: "test@example.com"
          };
          await Services.addUser(
            models,
            boughtPlan.planid.appid,
            boughtplanid,
            openLicence.id,
            inputUser,
            ta
          );

          await createLog(
            ip,
            "distributeLicence",
            {
              departmentid,
              boughtplanid,
              openLicence,
              hasRight,
              updatedLicence
            },
            giver,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  revokeLicence: requiresDepartmentCheck.createResolver(
    async (parent, { licenceid: id }, { models, ip, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const p1 = await models.Licence.findById(id, { raw: true });
          const p2 = await models.Licence.update(
            { unitid: null },
            {
              where: { id, unitid: { [models.Op.not]: null } },
              returning: true,
              transaction: ta,
              raw: true
            }
          );

          const [oldLicence, revokedLicence] = await Promise.all([p1, p2]);

          if (revokedLicence[0] == 0) {
            throw new Error("This Licence wasn't taken!");
          }

          const boughtPlan = await models.BoughtPlan.findById(p1.boughtplanid, {
            include: [models.Plan],
            raw: true,
            transaction: ta
          });
          await Services.removeUser(models, boughtPlan.planid.appid, p1.boughtplanid, id, ta);

          await createLog(
            ip,
            "revokeLicence",
            { oldLicence, revokedLicence: revokedLicence[1] },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  ),

  /**
   * Update Whois Privacy or Renewal Mode of a domain. Updating both at the same
   * time is not possible!
   * @param domainData: object
   * domainData can contain the properties:
   * domain: string
   * renewalmode: enum
   * whoisPrivacy: integer
   * cid: string
   * dns: object[]
   * @param licenceid: integer
   */
  updateDomain: requiresRight(["admin", "managedomains"]).createResolver(
    (parent, { domainData, licenceid: id }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const oldLicence = await models.Licence.findById(id, { raw: true });

          if (domainData.dns) {
            const rr = [];
            domainData.dns.forEach(dns => {
              rr.push({
                [dns.type]: [dns.data],
                ZONE: [dns.host],
                ADD: ["1"]
              });
            });

            domainData.rr = rr;
            delete domainData.dns;
            const updatedDNS = await dd24Api("UpdateDomain", domainData);

            if (updatedDNS && updatedDNS.code == 200) {
              const updatedLicence = await models.Licence.update(
                {
                  key: { dns: { ...domainData.dns } }
                },
                { transaction: ta, where: { id } }
              );

              await createLog(
                ip,
                "updateDomain",
                { updatedDNS, domainData, oldLicence, updatedLicence },
                unitid,
                ta
              );

              return { ok: true };
            } else {
              throw new NormalError({ message: updatedDNS.description });
            }
          }

          // Has to be created here to avoid problems when using Promise.all
          let p1;

          let queryString = "UPDATE licence_data SET key = jsonb_set(key";

          if (domainData.hasOwnProperty("whoisPrivacy")) {
            const enddate = moment(Date.now()).add(1, "year");
            let planid;

            if (domainData.domain.indexOf(".org")) {
              planid = 53;
            } else if (domainData.domain.indexOf(".com")) {
              planid = 51;
            } else {
              planid = 52;
            }

            p1 = models.BoughtPlan.create(
              {
                planid,
                buyer: unitid,
                payer: company,
                enddate,
                disabled: false,
                description: `Whois Privacy for ${domainData.domain}`
              },
              { transaction: ta }
            );

            queryString += `, '{whoisPrivacy}', '"${domainData.whoisPrivacy}"'`;
          } else {
            queryString += `, '{renewalmode}', '"${
              domainData.renewalmode == "ONCE" ||
              domainData.renewalmode == "AUTODELETE"
                ? 0
                : 1
            }"'`;
          }
          queryString += `) WHERE id = ${id} AND unitid = ${unitid}`;

          const updateDomain = await dd24Api("UpdateDomain", domainData);

          if (updateDomain.code == 200) {
            const p2 = models.sequelize.query(queryString, { transaction: ta });
            const [boughtPlan, updatedLicence] = await Promise.all([p1, p2]);

            await createLog(
              ip,
              "updateDomain",
              { boughtPlan, domainData, oldLicence, updatedLicence },
              unitid,
              ta
            );

            return { ok: true };
          } else {
            throw new Error(updateDomain.description);
          }
        } catch (err) {
          throw new NormalError({ message: err.message });
        }
      })
  )
};
