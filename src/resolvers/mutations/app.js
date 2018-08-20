import { decode } from "jsonwebtoken";
import moment from "moment";
import { NormalError } from "../errors";
import { requiresDepartmentCheck, requiresRight } from "../../helpers/permissions";
import dd24Api from "../../services/dd24";

/* eslint-disable no-return-await */

export default {
  distributeLicenceToDepartment: requiresDepartmentCheck.createResolver(
    (parent, { departmentid, boughtplanid, licencetype }, { models, token }) =>
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

          const [openLicences, haveNoLicence, hasRight, validPlan] = await Promise.all([
            p1,
            p2,
            p3,
            p4
          ]);
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
          } else if (validPlan && validPlan.endtime && validPlan.endtime < Date.now()) {
            return {
              ok: false,
              error: {
                code: 6,
                message: "The plan expired."
              }
            };
          }

          await models.DepartmentApp.create({ departmentid, boughtplanid }, { transaction: ta });

          const takeLicences = employees.map(
            async (employee, i) =>
              await models.Licence.update(
                {
                  unitid: employee
                },
                { where: { id: openLicences[i].id, unitid: null }, raw: true, transaction: ta }
              )
          );

          await Promise.all(takeLicences);
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

  revokeLicencesFromDepartment: requiresRight(["distributelicences", "admin"]).createResolver(
    (parent, { departmentid, boughtplanid }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          const p1 = models.DepartmentApp.destroy(
            { where: { departmentid, boughtplanid } },
            { transaction: ta }
          );

          const p2 = models.sequelize.query(
            `UPDATE licence_data SET unitid = null WHERE unitid IN (SELECT
             employee FROM department_employee_view WHERE id = :departmentid) AND
             (endtime > NOW() OR endtime ISNULL) AND boughtplanid = :boughtplanid`,
            { replacements: { departmentid, boughtplanid }, transaction: ta }
          );

          await Promise.all([p1, p2]);

          return { ok: true };
        } catch (err) {
          throw new Error(err);
        }
      })
  ),

  distributeLicence: requiresDepartmentCheck.createResolver(
    async (parent, { boughtplanid, unitid, departmentid }, { models }) => {
      try {
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

        const [openLicences, hasRight] = await Promise.all([p1, p2]);
        if (!openLicences) {
          return {
            ok: false,
            error: {
              code: 1,
              message: "There are no open Licences to distribute for this plan!"
            }
          };
        } else if (!openLicences && !hasRight) {
          return {
            ok: false,
            error: {
              code: 2,
              message: "There are no open Licences and you don't have the right to distribute!"
            }
          };
        } else if (!openLicences && hasRight) {
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

        await models.Licence.update(
          {
            unitid
          },
          { where: { boughtplanid, unitid: null, id: openLicences.id } }
        );

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  revokeLicence: requiresDepartmentCheck.createResolver(
    async (parent, { licenceid: id }, { models }) => {
      try {
        const res = await models.Licence.update(
          { unitid: null },
          { where: { id, unitid: { [models.Op.not]: null } } }
        );

        if (res[0] == 0) {
          throw new Error("This Licence wasn't taken!");
        }

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
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
    (parent, { domainData, licenceid: id }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          // Build the proper
          if (domainData.dns) {
            const rr = [];
            domainData.dns.forEach((dns, key) => {
              rr.push(`RR[${key}][${dns.type}][0]: ${dns.data}`);
              rr.push(`RR[${key}][ZONE][0]: ${dns.host}`);
              rr.push(`RR[${key}][ADD][0]: 1`);
            });

            rr.forEach(item => {
              domainData[item.substr(0, item.indexOf(":"))] = item.substr(item.indexOf(" ") + 1);
            });
            delete domainData.dns;
            console.log(domainData);
            const updatedDNS = await dd24Api("UpdateDomain", domainData);

            if (updatedDNS && updatedDNS.code == 200) {
              console.log("------->", updatedDNS);
              return { ok: true };
            } else {
              throw new NormalError({ message: updatedDNS.description, data: { test: "YO" } });
            }
          }

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
              domainData.renewalmode == "ONCE" || domainData.renewalmode == "AUTODELETE" ? 0 : 1
            }"'`;
          }
          queryString += `) WHERE id = ${id} AND unitid = ${unitid}`;

          const updateDomain = await dd24Api("UpdateDomain", domainData);

          if (updateDomain.code == 200) {
            const p2 = models.sequelize.query(queryString, { transaction: ta });
            await Promise.all([p1, p2]);

            return { ok: true };
          } else {
            throw new Error(updateDomain.description);
          }
        } catch (err) {
          throw new Error(err.message);
        }
      })
  )
};
