import { decode } from "jsonwebtoken";
import * as Services from "@vipfy-private/services";
import moment from "moment";
import { NormalError } from "../../errors";
import { requiresRights, requiresAuth } from "../../helpers/permissions";
import {
  createLog,
  createNotification,
  // checkPaymentData,
  checkPlanValidity,
  companyCheck
} from "../../helpers/functions";
// import {
//   addSubscriptionItem,
//   abortSubscription,
//   cancelPurchase
// } from "../../services/stripe";
import logger from "../../loggers";

/* eslint-disable no-return-await */

export default {
  distributeLicenceToDepartment: requiresRights([
    "create-licences"
  ]).createResolver(
    (_, { departmentid, boughtplanid, licencetype }, { models, token, ip }) =>
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

  revokeLicencesFromDepartment: requiresRights([
    "delete-licences"
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
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  distributeLicence: requiresRights(["create-licences"]).createResolver(
    (parent, { licenceid, unitid, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid: giver }
        } = decode(token);

        try {
          const p1 = models.Licence.findOne({
            where: {
              unitid: null,
              id: licenceid,
              endtime: {
                [models.Op.or]: {
                  [models.Op.eq]: null,
                  [models.Op.gt]: models.sequelize.fn("NOW")
                }
              }
            },
            raw: true
          });

          const p2 = models.Right.findOne({
            where: {
              holder: giver,
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
            { unitid },
            {
              where: { id: licenceid },
              transaction: ta
            }
          );

          const p4 = models.BoughtPlan.findById(openLicence.boughtplanid, {
            include: [models.Plan],
            raw: true,
            transaction: ta
          });

          const p5 = models.Human.findOne({
            where: { unitid },
            transaction: ta
          });

          const [updatedLicence, boughtPlan, user] = await Promise.all([
            p3,
            p4,
            p5
          ]);

          logger.debug("distributeLicence: boughtplan", { boughtPlan });

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
            boughtPlan["plan_datum.appid"],
            openLicence.boughtplanid,
            licenceid,
            inputUser,
            ta
          );

          const log = createLog(
            ip,
            "distributeLicence",
            {
              departmentid,
              openLicence,
              hasRight,
              updatedLicence
            },
            giver,
            ta
          );

          const notiGiver = createNotification(
            {
              receiver: giver,
              message: `Licence distributed to ${user.firstname} ${
                user.lastname
              }`,
              icon: "th",
              link: "teams",
              changed: ["foreignLicences"]
            },
            ta
          );

          const notiReceiver = createNotification(
            {
              receiver: unitid,
              message: `User ${giver} has given you access to a new App.
              Please relog in`,
              icon: "th",
              link: "teams",
              changed: ["ownLicences"]
            },
            ta
          );

          await Promise.all([log, notiGiver, notiReceiver]);

          return { ok: true };
        } catch (err) {
          await createNotification(
            {
              receiver: giver,
              message: "Distribution of App failed",
              icon: "th",
              link: "teams",
              changed: ["foreignLicences"]
            },
            ta
          );

          logger.error(err);
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  revokeLicence: requiresRights(["delete-licences"]).createResolver(
    async (parent, { licenceid: id }, { models, ip, token }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid }
        } = decode(token);

        try {
          const licence = await models.Licence.findOne({
            where: { id },
            raw: true
          });

          if (licence.unitid == null) {
            throw new Error("This Licence wasn't taken!");
          }

          const boughtPlan = await models.BoughtPlan.findOne(
            { where: { id: licence.boughtplanid } },
            {
              include: [models.Plan],
              raw: true
            }
          );

          await models.Licence.update(
            { unitid: null },
            {
              where: { id, unitid: { [models.Op.not]: null } },
              returning: true,
              transaction: ta
            }
          );

          await Services.removeUser(
            models,
            boughtPlan["plan_datum.appid"],
            licence.boughtplanid,
            id,
            ta
          );

          const log = createLog(ip, "revokedLicence", { licence }, unitid, ta);

          const notiGiver = createNotification(
            {
              receiver: unitid,
              message: `App revoked from ${licence.unitid}`,
              icon: "th",
              link: "teams",
              changed: ["foreignLicences"]
            },
            ta
          );

          const notiReceiver = createNotification(
            {
              receiver: licence.unitid,
              message: `User ${unitid} has revoked an App from you`,
              icon: "th",
              link: "teams",
              changed: ["ownLicences"]
            },
            ta
          );

          await Promise.all([log, notiGiver, notiReceiver]);

          return { ok: true };
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Revokation failed",
              icon: "th",
              link: "teams",
              changed: ["foreignLicences"]
            },
            ta
          );

          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  agreeToLicence: requiresAuth.createResolver(
    (parent, { licenceid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const updatedLicence = await models.Licence.update(
            { agreed: true },
            {
              where: { id: licenceid, unitid },
              returning: true,
              transaction: ta
            }
          );
          if (updatedLicence[0] == 0) {
            throw new Error("no such licence");
          }

          // TODO: save reference to licence agreements that user agreed to
          await createLog(
            ip,
            "agreeToLicence",
            { licenceid, updatedLicence: updatedLicence[1] },
            unitid,
            ta
          );
          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  trackMinutesSpent: requiresAuth.createResolver(
    async (parent, { licenceid, minutes }, { models, token }) => {
      try {
        if (minutes <= 0) {
          throw new Error("minutes must be positive");
        }

        const {
          user: { unitid }
        } = decode(token);
        const licence = await models.Licence.findOne({
          where: { id: licenceid, unitid },
          raw: true
        });
        if (!licence) {
          throw new Error("licence not found");
        }
        await models.sequelize.query(
          `INSERT INTO timetracking_data (licenceid, unitid, boughtplanid, day, minutesspent)
            VALUES (:licenceid, :unitid, :boughtplanid, now(), :minutesspent)
            ON CONFLICT (licenceid, unitid, day)
            DO UPDATE SET minutesspent = timetracking_data.minutesspent + EXCLUDED.minutesspent
            `,
          {
            replacements: {
              licenceid,
              unitid,
              boughtplanid: licence.boughtplanid,
              minutesspent: minutes
            },
            type: models.sequelize.QueryTypes.INSERT
          }
        );
        return { ok: true };
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  ),

  /**
   * Adds an BoughtPlan to handle external accounts
   *
   * @param {string} alias A name to display the plan to the user
   * @param {number} appid Id of the external app
   * @param {float} price The price of the plan
   * @param {string} loginurl The url to log the user into
   *
   * @returns {object}
   */
  addExternalBoughtPlan: requiresAuth.createResolver(
    (parent, { alias, appid, price, loginurl }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid, company }
        } = decode(token);

        // let subscription = null;
        // eslint-disable-next-line
        let stripeplan = null;

        try {
          const plan = await models.Plan.findOne({
            where: { appid, options: { external: true } },
            raw: true
          });

          if (!plan) {
            throw new Error(
              "This App is not integrated to handle external Accounts yet."
            );
          }

          await checkPlanValidity(plan);

          // subscription = await checkPaymentData(
          //   company,
          //   plan.stripedata.id,
          //   ta
          // );

          // const department = await models.Department.findOne({
          //   where: { unitid },
          //   raw: true
          // });

          // if (!subscription) {
          //   subscription = await addSubscriptionItem(
          //     department.payingoptions.stripe.subscription,
          //     plan.stripedata.id
          //   );

          //   stripeplan = subscription.id;
          // } else {
          //   stripeplan = subscription.items.data[0].id;
          // }

          const boughtPlan = await models.BoughtPlan.create(
            {
              planid: plan.id,
              alias,
              disabled: false,
              buyer: unitid,
              payer: company,
              usedby: company,
              totalprice: 0,
              key: {
                external: true,
                externaltotalprice: price,
                loginurl
              },
              stripeplan
            },
            { transaction: ta }
          );

          await createLog(
            ip,
            "addExternalBoughtPlan",
            { appid, boughtPlan },
            unitid,
            ta
          );

          return boughtPlan;
        } catch (err) {
          // if (subscription && stripeplan) {
          //   const kind = stripeplan.split("_");
          //   if (kind[0] == "sub") {
          //     await abortSubscription(stripeplan);
          //   } else {
          //     await cancelPurchase(stripeplan, subscription.id);
          //   }
          // }

          logger.error(err);

          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),
  /**
   * Adds an external account of an app to the users personal Account
   *
   * @param {string} username Username at the external app
   * @param {string} password Password at the external app
   * @param {string} subdomain Subdomain the app runs under
   * @param {string} loginurl The url to log the user into
   * @param {float} price Optional price of the external account
   * @param {ID} appid Id of the external app
   * @param {ID} boughtplanid Id of the bought plan the licence should belong to
   * @param {ID} touser If the licence should belong to another user
   *
   * @returns {object}
   */
  addExternalLicence: requiresAuth.createResolver(
    (parent, args, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid, company }
        } = decode(token);

        try {
          let admin = null;

          if (args.touser) {
            admin = await companyCheck(company, unitid, args.touser);
          } else {
            admin = await models.User.findOne({
              where: { id: unitid },
              raw: true
            });
          }

          const oldBoughtPlan = await models.BoughtPlan.findOne({
            where: { id: args.boughtplanid },
            endtime: {
              [models.Op.or]: {
                [models.Op.gt]: models.sequelize.fn("NOW"),
                [models.Op.eq]: null
              }
            },
            raw: true
          });

          if (!oldBoughtPlan) {
            throw new Error("Couldn't find a valid Plan!");
          }

          const plan = await models.Plan.findOne({
            where: { id: oldBoughtPlan.planid, options: { external: true } },
            raw: true
          });

          if (!plan) {
            throw new Error(
              "This App is not integrated to handle external Accounts yet."
            );
          }

          await checkPlanValidity(plan);
          let externaltotalprice = args.price;

          if (oldBoughtPlan.key && oldBoughtPlan.key.externaltotalprice) {
            externaltotalprice += oldBoughtPlan.key.externaltotalprice;
          }

          await models.BoughtPlan.update(
            {
              key: {
                ...oldBoughtPlan.key,
                externaltotalprice
              }
            },
            {
              where: { id: args.boughtplanid },
              transaction: ta,
              returning: true
            }
          );

          const licence = await models.Licence.create(
            {
              unitid: args.touser || unitid,
              disabled: false,
              boughtplanid: args.boughtplanid,
              agreed: true,
              key: { ...args, external: true }
            },
            { transaction: ta }
          );

          const p1 = createLog(
            ip,
            "addExternalLicence",
            {
              licence: licence.id,
              oldBoughtPlan,
              ...args
            },
            unitid,
            ta
          );

          const p2 = createNotification(
            {
              receiver: unitid,
              message: `Integrated external Account`,
              icon: "user-plus",
              link: `marketplace/${args.appid}`,
              changed: ["ownLicences"]
            },
            ta
          );

          const promises = [p1, p2];

          if (args.toUser) {
            const p3 = createNotification(
              {
                receiver: args.touser,
                message: `${admin.firstname} ${
                  admin.lastname
                } integrated an external Account for you.`,
                icon: "user-plus",
                link: `marketplace/${args.appid}`,
                changed: ["ownLicences"]
              },
              ta
            );

            promises.push(p3);
          }

          await Promise.all(promises);

          return { ok: true };
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Integration of external Account failed",
              icon: "bug",
              link: `marketplace/${args.appid}`,
              changed: []
            },
            ta
          );
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  /**
   * Removes a licence from an user
   *
   * @param {ID} licenceid The id of the licence
   * @param {ID} fromuser Optional parameter if the licence belongs to an employee
   * @returns {object}
   */
  suspendLicence: requiresRights(["delete-licences"]).createResolver(
    async (parent, { licenceid: id, fromuser, clear }, { models, ip, token }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid, company }
        } = decode(token);

        let admin = null;
        const config = { unitid: null };

        try {
          if (fromuser) {
            admin = await companyCheck(company, unitid, fromuser);
          } else {
            admin = await models.User.findOne({
              where: { id: fromuser },
              raw: true
            });
          }

          if (clear) {
            config.key = null;
          }

          const licence = await models.Licence.findOne({
            where: { id, unitid: fromuser || unitid },
            raw: true
          });

          const suspended = await models.Licence.update(config, {
            where: { id, unitid: licence.unitid },
            transaction: ta
          });

          if (suspended == 0) {
            throw new Error("Licence not found!");
          }

          const p1 = createLog(ip, "suspendLicence", { licence }, unitid, ta);

          const p2 = createNotification(
            {
              receiver: unitid,
              message: `Suspended Licence`,
              icon: "user-minus",
              link: `teams`,
              changed: ["ownLicences"]
            },
            ta
          );

          const promises = [p1, p2];

          if (fromuser) {
            const p4 = createNotification(
              {
                receiver: fromuser,
                message: `${admin.firstname} ${
                  admin.lastname
                } removed a Licence from you.`,
                icon: "user-plus",
                link: "teams",
                changed: ["ownLicences"]
              },
              ta
            );

            promises.push(p4);
          }

          await Promise.all(promises);

          return { ok: true };
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Suspension of Licence failed",
              icon: "bug",
              link: `teams`,
              changed: []
            },
            ta
          );
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  clearLicence: requiresRights(["delete-licences"]).createResolver(
    async (parent, { licenceid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid }
        } = decode(token);

        try {
          const licence = await models.Licence.findOne({
            where: { id: licenceid, unitid: null },
            raw: true
          });

          if (!licence) {
            throw new Error("This Licence still belongs to an user!");
          }

          const suspended = await models.Licence.update(
            { key: null },
            {
              where: { id: licence.id },
              transaction: ta
            }
          );

          if (suspended == 0) {
            throw new Error("Licence not found!");
          }

          const p1 = createLog(ip, "clearLicence", { licence }, unitid, ta);

          const p2 = createNotification(
            {
              receiver: unitid,
              message: `Logindata of Licence ${licence.id} cleared`,
              icon: "trash",
              link: `teams`,
              changed: ["ownLicences"]
            },
            ta
          );

          await Promise.all([p1, p2]);

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  deleteLicenceAt: requiresRights(["delete-licences"]).createResolver(
    async (parent, { licenceid, time }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const parsedTime = moment(time).valueOf();
          const config = { endtime: parsedTime };

          const licence = await models.sequelize.query(
            `
        SELECT ld.*, pd.cancelperiod
        FROM licence_data ld
            LEFT OUTER JOIN boughtplan_data bd on ld.boughtplanid = bd.id
            INNER JOIN plan_data pd on bd.planid = pd.id
        WHERE ld.id = :licenceid
          AND (bd.endtime IS NULL OR bd.endtime > NOW())
          AND bd.payer = :company`,
            {
              replacements: { licenceid, company },
              type: models.sequelize.QueryTypes.SELECT
            }
          );

          if (licence.length < 1) {
            throw new Error(
              "BoughtPlan doesn't exist or isn't active anymore!"
            );
          }

          if (!licence[0].key || (licence[0].key && !licence[0].key.external)) {
            // Only "normal" licences have an end time. External ones end directly.
            const period = Object.keys(licence[0].cancelperiod)[0];

            const estimatedEndtime = moment()
              .add(licence[0].cancelperiod[period], period)
              .valueOf();

            if (parsedTime <= estimatedEndtime) {
              config.endtime = estimatedEndtime;
            }
          }

          const updatedLicence = await models.Licence.update(config, {
            where: { id: licence[0].id },
            transaction: ta
          });

          if (updatedLicence[0] == 0) {
            throw new Error("Couldn't update Licence");
          }

          const p1 = createLog(ip, "deleteLicenceAt", { licence }, unitid, ta);

          const p2 = createNotification(
            {
              receiver: unitid,
              message: `Set endtime of Licence ${licence[0].id} to ${moment(
                config.endtime
              ).toDate()}`,
              icon: "business-time",
              link: `teams`,
              changed: ["ownLicences"]
            },
            ta
          );

          await Promise.all([p1, p2]);

          return moment(config.endtime).toDate();
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  deleteBoughtPlanAt: requiresRights(["delete-licences"]).createResolver(
    async (parent, { boughtplanid, time }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const parsedTime = moment(time).valueOf();
          const config = { endtime: parsedTime };

          const boughtPlan = await models.sequelize.query(
            `
            SELECT bd.*, pd.cancelperiod
            FROM boughtplan_data bd
                INNER JOIN plan_data pd on bd.planid = pd.id
            WHERE bd.id = :boughtplanid
              AND (bd.endtime IS NULL OR bd.endtime > NOW())
              AND bd.payer = :company`,
            {
              replacements: { boughtplanid, company },
              type: models.sequelize.QueryTypes.SELECT
            }
          );

          if (boughtPlan.length < 1) {
            throw new Error(
              "BoughtPlan doesn't exist or isn't active anymore!"
            );
          }

          const period = Object.keys(boughtPlan[0].cancelperiod)[0];
          const estimatedEndtime = moment()
            .add(boughtPlan[0].cancelperiod[period], period)
            .valueOf();

          if (parsedTime <= estimatedEndtime) {
            config.endtime = estimatedEndtime;
          }

          const p3 = models.BoughtPlan.update(config, {
            where: { id: boughtPlan[0].id },
            transaction: ta
          });

          const p4 = models.Licence.findAll({
            where: { boughtplanid: boughtPlan[0].id },
            raw: true
          });

          const [updatedBoughtPlan, licences] = await Promise.all([p3, p4]);

          if (updatedBoughtPlan[0] == 0) {
            throw new Error("Couldn't update Plan");
          }

          const licencesToUpdate = licences.map(async ({ id }) => {
            await models.Licence.update(config, { where: { id } });
          });

          await Promise.all(licencesToUpdate);

          const p1 = createLog(
            ip,
            "deleteBoughtPlanAt",
            { boughtPlan },
            unitid,
            ta
          );

          const p2 = createNotification(
            {
              receiver: unitid,
              message: `Set endtime of Plan ${boughtPlan[0].id} to ${moment(
                config.endtime
              ).toDate()}`,
              icon: "business-time",
              link: `teams`,
              changed: ["ownLicences"]
            },
            ta
          );

          await Promise.all([p1, p2]);

          return moment(config.endtime).toDate();
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  voteForApp: requiresAuth.createResolver(
    async (parent, { app }, { models, token }) => {
      const {
        user: { unitid }
      } = decode(token);
      try {
        await models.AppVote.create({ unitid, app });
        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  updateCredentials: requiresAuth.createResolver(
    async (parent, args, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);
          const { licenceid, ...credentials } = args;

          const [licence] = await models.sequelize.query(
            `
            SELECT ld.*, bd.alias
            FROM licence_data ld
                  INNER JOIN boughtplan_data bd on ld.boughtplanid = bd.id
            WHERE bd.payer = :company
              AND ld.id = :licenceid
          `,
            {
              replacements: { company, licenceid },
              type: models.sequelize.QueryTypes.SELECT
            }
          );

          if (!licence) {
            throw new Error("Licence not found");
          }

          await models.Licence.update(
            {
              key: { ...licence.key, ...credentials }
            },
            {
              where: { id: licenceid },
              transaction: ta
            }
          );

          const p1 = createLog(
            ip,
            "updateCredentials",
            { licenceid },
            unitid,
            ta
          );

          const p2 = createNotification(
            {
              receiver: unitid,
              message: `Successfully updated credentials of ${licence.alias}`,
              icon: "key",
              link: `teams`,
              changed: ["ownLicences"]
            },
            ta
          );

          await Promise.all([p1, p2]);

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updateLayout: requiresAuth.createResolver(
    async (parent, { layouts }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const promises = layouts.map(async ({ id, ...data }) => {
            return await models.Licence.update(data, {
              where: { id, unitid },
              transaction: ta
            });
          });

          await Promise.all(promises);

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
