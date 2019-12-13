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
  companyCheck,
  concatName
} from "../../helpers/functions";
// import {
//   addSubscriptionItem,
//   abortSubscription,
//   cancelPurchase
// } from "../../services/stripe";
import logger from "../../loggers";
import { uploadAppImage } from "../../services/aws";
import {
  checkCompanyMembership,
  checkLicenceValidilty,
  checkOrbitMembership
} from "../../helpers/companyMembership";
import { sendEmail } from "../../helpers/email";
import freshdeskAPI from "../../services/freshdesk";
import Axios from "axios";
import freshdesk from "../../services/freshdesk";
/* eslint-disable no-return-await */

export default {
  distributeLicence: requiresRights(["create-licences"]).createResolver(
    (_parent, { licenceid, unitid, departmentid }, context) =>
      context.models.sequelize.transaction(async ta => {
        const { models, session } = context;
        const {
          user: { unitid: giver }
        } = decode(session.token);

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

          const p3 = models.LicenceData.update(
            { unitid },
            {
              where: { id: licenceid },
              transaction: ta
            }
          );

          const p4 = models.BoughtPlan.findByPk(openLicence.boughtplanid, {
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
            context,
            "distributeLicence",
            {
              departmentid,
              openLicence,
              hasRight,
              updatedLicence
            },
            ta
          );

          const notiGiver = createNotification(
            {
              receiver: giver,
              message: `Licence distributed to ${user.firstname} ${user.lastname}`,
              icon: "th",
              link: "teams",
              changed: ["ownLicences"]
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
              changed: ["ownLicences"]
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

  agreeToLicence: requiresAuth.createResolver(
    (_parent, { licenceid }, context) =>
      context.models.sequelize.transaction(async ta => {
        const { models, session } = context;

        try {
          const {
            user: { unitid }
          } = decode(session.token);

          const updatedLicence = await models.LicenceData.update(
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
            context,
            "agreeToLicence",
            { licenceid, updatedLicence: updatedLicence[1] },
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
    async (_p, { licenceid, minutes }, { models, session }) => {
      try {
        if (minutes <= 0) {
          throw new Error("minutes must be positive");
        }

        const {
          user: { unitid }
        } = decode(session.token);
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
    (_p, { alias, appid, price, loginurl }, context) =>
      context.models.sequelize.transaction(async ta => {
        const { models, session } = context;

        const {
          user: { unitid, company }
        } = decode(session.token);

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
            context,
            "addExternalBoughtPlan",
            { appid, boughtPlan },
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
  addExternalLicence: requiresAuth.createResolver((_p, args, context) =>
    context.models.sequelize.transaction(async ta => {
      const { models, session } = context;

      const {
        user: { unitid, company }
      } = decode(session.token);

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
          externaltotalprice = oldBoughtPlan.key.externaltotalprice;
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

        const licence = await models.LicenceData.create(
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
          context,
          "addExternalLicence",
          {
            licence: licence.id,
            oldBoughtPlan,
            ...args
          },
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
              message: `${admin.firstname} ${admin.lastname} integrated an external Account for you.`,
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
   * Adds an external account of an app to the users personal Account
   *
   * @param {float} price Optional price of the external account
   * @param {ID} appid Id of the external app
   * @param {ID} boughtplanid Id of the bought plan the licence should belong to
   * @param {ID} touser If the licence should belong to another user
   *
   * @returns {object}
   */
  addEncryptedExternalLicence: requiresAuth.createResolver(
    (_p, args, context) =>
      context.models.sequelize.transaction(async ta => {
        const { models, session } = context;

        const {
          user: { unitid, company }
        } = decode(session.token);

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
            externaltotalprice = oldBoughtPlan.key.externaltotalprice;
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

          const licence = await models.LicenceData.create(
            {
              unitid: args.touser || unitid,
              disabled: false,
              boughtplanid: args.boughtplanid,
              agreed: true,
              key: args.key
            },
            { transaction: ta }
          );

          const p1 = createLog(
            context,
            "addExternalLicence",
            {
              licence: licence.id,
              oldBoughtPlan,
              ...args
            },
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
                message: `${admin.firstname} ${admin.lastname} integrated an external Account for you.`,
                icon: "user-plus",
                link: `marketplace/${args.appid}`,
                changed: ["ownLicences"]
              },
              ta
            );

            promises.push(p3);
          }

          await Promise.all(promises);

          console.log("LICENCE", licence.dataValues);
          return licence;
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

  deleteServiceLicenceAt: requiresRights(["delete-licences"]).createResolver(
    async (_p, { serviceid, licenceid, time }, context) =>
      context.models.sequelize.transaction(async ta => {
        const { models, session } = context;

        try {
          const {
            user: { unitid, company }
          } = decode(session.token);

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

          const updatedLicence = await models.LicenceData.update(config, {
            where: { id: licence[0].id },
            transaction: ta
          });

          await models.LicenceRight.update(config, {
            where: { licenceid: licence[0].id },
            transaction: ta
          });

          if (updatedLicence[0] == 0) {
            throw new Error("Couldn't update Licence");
          }

          const p1 = createLog(
            context,
            "deleteServiceLicenceAt",
            { licence },
            ta
          );

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

  deleteLicenceAt: requiresRights(["delete-licences"]).createResolver(
    async (_, { licenceid, time }, context) => {
      const { models, session } = context;

      const parsedTime = moment(time).valueOf();
      const config = { endtime: parsedTime };
      await models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);

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

          const updatedLicence = await models.LicenceData.update(config, {
            where: { id: licence[0].id },
            transaction: ta
          });

          await models.LicenceRight.update(config, {
            where: { licenceid: licence[0].id },
            transaction: ta
          });

          if (updatedLicence[0] == 0) {
            throw new Error("Couldn't update Licence");
          }

          const p1 = createLog(context, "deleteLicenceAt", { licence }, ta);

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
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      });
      return moment(config.endtime).toDate();
    }
  ),

  deleteBoughtPlanAt: requiresRights(["delete-licences"]).createResolver(
    async (_p, { boughtplanid, time }, context) =>
      context.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = context;
          const {
            user: { unitid, company }
          } = decode(session.token);

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
            await models.LicenceData.update(config, { where: { id } });
          });

          await Promise.all(licencesToUpdate);

          const p1 = createLog(
            context,
            "deleteBoughtPlanAt",
            { boughtPlan },
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
    async (parent, { app }, { models, session }) => {
      const {
        user: { unitid }
      } = decode(session.token);
      try {
        await models.AppVote.create({ unitid, app });
        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  updateCredentials: requiresAuth.createResolver(async (_p, args, context) =>
    context.models.sequelize.transaction(async ta => {
      const { models, session } = context;

      try {
        const {
          user: { unitid, company }
        } = decode(session.token);
        const { licenceid, ...credentials } = args;

        const [licence] = await models.sequelize.query(
          `
            SELECT ld.*, bd.alias
            FROM licence_view ld
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

        if (licence.options && licence.options.nosetup) {
          delete licence.options.nosetup;
        }

        await models.LicenceData.update(
          {
            key: { ...licence.key, ...credentials },
            options: licence.options
          },
          {
            where: { id: licenceid },
            transaction: ta
          }
        );

        const p1 = createLog(context, "updateCredentials", { licenceid }, ta);

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
    async (_p, { layout }, { models, session }) => {
      try {
        const {
          user: { unitid }
        } = decode(session.token);
        const { id: licenceid, ...data } = layout;

        const layoutExists = await models.LicenceLayout.findOne({
          where: { licenceid, unitid },
          raw: true
        });

        if (layoutExists) {
          await models.LicenceLayout.update(data, {
            where: { licenceid, unitid }
          });
        } else {
          await models.LicenceLayout.create({ ...data, licenceid, unitid });
        }

        const licence = await models.Licence.findOne({
          where: { id: licenceid },
          raw: true
        });

        return { ...licence, dashboard: data.dashboard };
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  ),

  switchAppsLayout: requiresAuth.createResolver(
    async (_p, { app1, app2 }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(session.token);

          let layoutExistsApp1 = await models.LicenceLayout.findOne({
            where: { licenceid: app1.id, unitid },
            transaction: ta,
            raw: true
          });

          let layoutExistsApp2 = await models.LicenceLayout.findOne({
            where: { licenceid: app2.id, unitid },
            raw: true,
            transaction: ta
          });

          if (!layoutExistsApp1) {
            const res = await models.LicenceLayout.create(
              {
                dashboard: app1.dashboard,
                licenceid: app1.id,
                unitid
              },
              { transaction: ta }
            );
            layoutExistsApp1 = res.get();
          }

          if (!layoutExistsApp2) {
            const res = await models.LicenceLayout.create(
              {
                dashboard: app2.dashboard,
                licenceid: app2.id,
                unitid
              },
              { transaction: ta }
            );
            layoutExistsApp2 = res.get();
          }

          const res = await Promise.all([
            models.LicenceLayout.update(
              { dashboard: app2.dashboard },
              {
                where: { licenceid: app1.id, unitid },
                transaction: ta
              }
            ),
            models.LicenceLayout.update(
              { dashboard: app1.dashboard },
              {
                where: { licenceid: app2.id, unitid },
                transaction: ta
              }
            ),
            models.Licence.findOne({
              where: { id: app1.id, unitid },
              transaction: ta,
              raw: true
            }),
            models.Licence.findOne({
              where: { id: app2.id, unitid },
              transaction: ta,
              raw: true
            })
          ]);

          return [
            { ...res[2], dashboard: app2.dashboard },
            { ...res[3], dashboard: app1.dashboard }
          ];
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  createOwnApp: requiresRights(["create-licences"]).createResolver(
    async (_p, { ssoData, userids }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);
          const { images, loginurl, ...data } = ssoData;

          let appOwned = null;

          if (images && images.length == 2) {
            const [logo, icon] = await Promise.all(
              images.map(async (upload, index) => {
                const pic = await upload;
                const filename = index == 0 ? "logo.png" : "icon.png";

                const name = await uploadAppImage(pic, ssoData.name, filename);
                return name;
              })
            );

            appOwned = await models.App.create(
              {
                ...data,
                loginurl,
                logo,
                icon,
                options: { universallogin: true },
                disabled: false,
                developer: company,
                supportunit: company,
                owner: company
              },
              { transaction: ta }
            );
          } else {
            appOwned = await models.App.create(
              {
                ...data,
                loginurl,
                options: { universallogin: true },
                disabled: false,
                developer: company,
                supportunit: company,
                owner: company
              },
              { transaction: ta }
            );
          }

          const plan = await models.Plan.create(
            {
              name: `${data.name} Integrated`,
              appid: appOwned.dataValues.id,
              teaserdescription: `Integrated Plan for ${data.name}`,
              startdate: models.sequelize.fn("NOW"),
              numlicences: 0,
              price: 0.0,
              options: { external: true, integrated: true },
              payperiod: { years: 1 },
              cancelperiod: { secs: 1 },
              hidden: true
            },
            { transaction: ta }
          );
          let licence = null;
          if (!ssoData.manager) {
            const boughtPlan = await models.BoughtPlan.create(
              {
                planid: plan.id,
                alias: data.name,
                disabled: false,
                buyer: unitid,
                payer: company,
                usedby: company,
                totalprice: 0,
                key: {
                  integrated: true,
                  external: true,
                  externaltotalprice: 0,
                  loginurl: data.loginurl
                },
                stripeplan: null // Maybe we need one later
              },
              { transaction: ta }
            );
            if (userids) {
              const licencepromises = [];
              userids.forEach(u =>
                licencepromises.push(
                  models.LicenceData.create(
                    {
                      unitid: u,
                      disabled: false,
                      boughtplanid: boughtPlan.id,
                      agreed: true,
                      key: { ...data, external: true }
                    },
                    { transaction: ta }
                  )
                )
              );
              await Promise.all(licencepromises);
              const notifypromises = [];
              userids.forEach(u =>
                notifypromises.push(
                  createNotification(
                    {
                      receiver: u,
                      message: `You have a new service`,
                      icon: "business-time",
                      link: `dashboard`,
                      changed: ["ownLicences"]
                    },
                    ta
                  )
                )
              );
              await Promise.all(notifypromises);
            } else {
              licence = await models.LicenceData.create(
                {
                  unitid,
                  disabled: false,
                  boughtplanid: boughtPlan.id,
                  agreed: true,
                  key: { ...data, external: true }
                },
                { transaction: ta }
              );
              await createNotification(
                {
                  receiver: unitid,
                  message: `You have a new service`,
                  icon: "business-time",
                  link: `dashboard`,
                  changed: ["ownLicences"]
                },
                ta
              );
            }
          }
          return licence != null ? licence : { id: appOwned.dataValues.id };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  giveTemporaryAccess: requiresRights(["edit-licenceRights"]).createResolver(
    async (_p, { licences }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company }
          } = decode(session.token);

          const errors = [];
          const newLicences = [];
          let ok = true;

          for await (const licence of licences) {
            try {
              if (!licence.starttime && !licence.endtime) {
                throw new Error("No start or endtime set!");
              }

              if (!licence.tags || licence.tags.length < 1) {
                throw new Error("Please specify the reason for the access!");
              }

              const { id: licenceid, ...data } = licence;

              checkCompanyMembership(licence.impersonator, company);

              const createdLicence = await models.LicenceRight.create({
                ...data,
                licenceid,
                unitid: licence.impersonator,
                transaction: ta
              });

              newLicences.push(createdLicence.dataValues);

              await createNotification(
                {
                  receiver: licence.impersonator,
                  message: `You got vacation access granted for a new Service`,
                  link: "dashboard",
                  icon: "th",
                  changed: ["ownLicences"]
                },
                ta
              );
            } catch (error) {
              errors.push(licence.id);
              ok = false;
            }
          }

          return { errors, licences: newLicences, ok };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  deleteService: requiresRights([
    "delete-licences, delete-boughtplans"
  ]).createResolver(async (_p, { serviceid, time }, context) =>
    context.models.sequelize.transaction(async ta => {
      try {
        const { models, session } = context;

        const {
          user: { company }
        } = decode(session.token);

        const parsedTime = moment(time).valueOf();
        const config = { endtime: parsedTime };

        const boughtPlans = await models.sequelize.query(
          `
            SELECT bd.*, pd.cancelperiod
            FROM boughtplan_data bd
                INNER JOIN plan_data pd on bd.planid = pd.id
            WHERE (bd.endtime IS NULL OR bd.endtime > NOW())
              AND bd.payer = :company
              and appid = :serviceid`,
          {
            replacements: { company, serviceid },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        if (boughtPlans.length < 1) {
          throw new Error("BoughtPlan doesn't exist or isn't active anymore!");
        }

        const updatePromises = [];
        const licencePromises = [];
        const departmentPromises = [];

        const app = await models.App.findOne({
          where: { id: serviceid },
          raw: true,
          transaction: ta
        });

        if (app.owner == company) {
          updatePromises.push(
            models.App.update(
              { disabled: true },
              { where: { id: serviceid }, transaction: ta }
            )
          );
        }

        boughtPlans.forEach(boughtPlan => {
          const period = Object.keys(boughtPlan.cancelperiod)[0];
          const estimatedEndtime = moment()
            .add(boughtPlan.cancelperiod[period], period)
            .valueOf();

          if (parsedTime <= estimatedEndtime) {
            config.endtime = estimatedEndtime;
          }

          updatePromises.push(
            models.BoughtPlan.update(config, {
              where: { id: boughtPlan.id },
              transaction: ta
            })
          );

          licencePromises.push(
            models.LicenceData.update(config, {
              where: { boughtplanid: boughtPlan.id }
            })
          );

          departmentPromises.push(
            models.DepartmentApp.destroy(
              { where: { boughtplanid: boughtPlan.id } },
              { transaction: ta }
            )
          );
        });

        await Promise.all(updatePromises, licencePromises, departmentPromises);

        await createLog(context, "deleteService", { serviceid }, ta);

        return true;
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    })
  ),

  updateTemporaryAccess: requiresRights(["edit-licenceRights"]).createResolver(
    async (_, { licence, rightid }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          // Don't update the id!!!
          if (licence.id) {
            delete licence.id;
          }

          if (licence.licenceid) {
            delete licence.licenceid;
          }

          licence.unitid = licence.user;
          delete licence.user;

          const oldLicence = await models.LicenceRight.findOne({
            where: { id: rightid },
            raw: true
          });

          await models.LicenceRight.update(licence, {
            where: { id: rightid },
            returning: true,
            transaction: ta
          });

          await createNotification(
            {
              receiver: oldLicence.unitid,
              message: `The admin updated your vacation licence`,
              link: "teammanager",
              icon: "th",
              changed: ["ownLicences"]
            },
            ta
          );

          return { ...oldLicence, ...licence };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),
  removeLicence: requiresRights(["delete-licences"]).createResolver(
    async (_, { licenceid, oldname }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models } = ctx;

        try {
          const oldLicence = await models.LicenceData.findOne({
            where: { id: licenceid },
            raw: true
          });

          const remove = await models.LicenceData.update(
            {
              unitid: null,
              options: models.sequelize.literal(
                `options || jsonb '{"identifier": "Old account of ${oldname}"}'`
              )
            },
            {
              where: { id: licenceid },
              transaction: ta
            }
          );

          await models.LicenceRight.update(
            { endtime: models.sequelize.fn("NOW") },
            { where: { licenceid }, transaction: ta }
          );

          if (remove == 0) {
            throw new Error("Licence not found!");
          }

          await createNotification(
            {
              receiver: oldLicence.unitid,
              message: `The admin removed a licence from you`,
              link: "dashboard",
              icon: "th",
              changed: ["ownLicences"]
            },
            ta
          );

          await createLog(ctx, "removeLicence", { licenceid }, ta);

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  distributeLicence10: requiresRights(["edit-licences"]).createResolver(
    async (_p, { licenceid, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models } = ctx;
          const distribute = await models.LicenceData.update(
            { unitid: userid },
            {
              where: { id: licenceid },
              transaction: ta
            }
          );

          await createNotification(
            {
              receiver: userid,
              message: `You have a new service`,
              icon: "business-time",
              link: `dashboard`,
              changed: ["ownLicences"]
            },
            ta
          );

          if (distribute == 0) {
            throw new Error("Licence not found!");
          }

          await createLog(ctx, "distributeLicence", { licenceid, userid }, ta);

          return true;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  removeTemporaryAccess: requiresRights(["edit-licenceRights"]).createResolver(
    async (_, { rightid }, { models }) =>
      models.sequelize.transaction(async ta => {
        try {
          const { unitid } = await models.LicenceRight.findOne({
            where: { id: rightid },
            transaction: ta,
            raw: true
          });

          await models.LicenceRight.update(
            { endtime: models.sequelize.fn("NOW") },
            { where: { id: rightid }, transaction: ta }
          );

          await createNotification(
            {
              receiver: unitid,
              message: "The admin removed your access to a vacation licence",
              icon: "th",
              link: `teammanager`,
              changed: ["ownLicences"]
            },
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

  addExternalAccountLicence: requiresAuth.createResolver((_p, args, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      try {
        const {
          touser,
          boughtplanid,
          price,
          appid = 0,
          loginurl,
          password,
          username,
          subdomain,
          identifier,
          options
        } = args;
        const { models, session } = ctx;
        const {
          user: { unitid, company }
        } = decode(session.token);
        let admin = null;

        if (touser) {
          admin = await companyCheck(company, unitid, touser);
        } else {
          admin = await models.User.findOne({
            where: { id: unitid },
            raw: true
          });
        }

        const oldBoughtPlan = await models.BoughtPlan.findOne({
          where: { id: boughtplanid },
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
        let externaltotalprice = price;

        if (oldBoughtPlan.key && oldBoughtPlan.key.externaltotalprice) {
          externaltotalprice = oldBoughtPlan.key.externaltotalprice;
        }

        await models.BoughtPlan.update(
          {
            key: {
              ...oldBoughtPlan.key,
              externaltotalprice
            }
          },
          {
            where: { id: boughtplanid },
            transaction: ta,
            returning: true
          }
        );

        const licence = await models.LicenceData.create(
          {
            unitid: touser,
            disabled: false,
            boughtplanid,
            agreed: true,
            key: { loginurl, password, username, subdomain, external: true },
            options: { identifier, ...options }
          },
          { transaction: ta }
        );

        const p1 = createLog(
          ctx,
          "addExternalLicence",
          {
            licence: licence.id,
            oldBoughtPlan
          },
          ta
        );

        const p2 = createNotification(
          {
            receiver: unitid,
            message: `Integrated external Account`,
            icon: "user-plus",
            link: `marketplace/${appid}`,
            changed: ["ownLicences"]
          },
          ta
        );

        const promises = [p1, p2];

        if (touser) {
          const p3 = createNotification(
            {
              receiver: touser,
              message: `${admin.firstname} ${admin.lastname} integrated an external Account for you.`,
              icon: "user-plus",
              link: `marketplace/${appid}`,
              changed: ["ownLicences"]
            },
            ta
          );

          promises.push(p3);
        }

        await Promise.all(promises);

        return licence.id;
      } catch (err) {
        await createNotification(
          {
            receiver: unitid,
            message: "Integration of external Account failed",
            icon: "bug",
            link: `marketplace/${appid}`,
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

  addEncryptedExternalAccountLicence: requiresAuth.createResolver(
    (_p, args, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            touser,
            boughtplanid,
            price,
            appid = 0,
            identifier,
            key,
            options
          } = args;
          const { models, session } = ctx;
          const {
            user: { unitid, company }
          } = decode(session.token);
          let admin = null;

          if (touser) {
            admin = await companyCheck(company, unitid, touser);
          } else {
            admin = await models.User.findOne({
              where: { id: unitid },
              raw: true
            });
          }

          const oldBoughtPlan = await models.BoughtPlan.findOne({
            where: { id: boughtplanid },
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
          let externaltotalprice = price;

          if (oldBoughtPlan.key && oldBoughtPlan.key.externaltotalprice) {
            externaltotalprice = oldBoughtPlan.key.externaltotalprice;
          }

          await models.BoughtPlan.update(
            {
              key: {
                ...oldBoughtPlan.key,
                externaltotalprice
              }
            },
            {
              where: { id: boughtplanid },
              transaction: ta,
              returning: true
            }
          );

          const licence = await models.LicenceData.create(
            {
              unitid: touser,
              disabled: false,
              boughtplanid,
              agreed: true,
              key,
              options: { identifier, ...options }
            },
            { transaction: ta }
          );

          const p1 = createLog(
            ctx,
            "addExternalLicence",
            {
              licence: licence.id,
              oldBoughtPlan
            },
            ta
          );

          const p2 = createNotification(
            {
              receiver: unitid,
              message: `Integrated external Account`,
              icon: "user-plus",
              link: `marketplace/${appid}`,
              changed: ["ownLicences"]
            },
            ta
          );

          const promises = [p1, p2];

          if (touser) {
            const p3 = createNotification(
              {
                receiver: touser,
                message: `${admin.firstname} ${admin.lastname} integrated an external Account for you.`,
                icon: "user-plus",
                link: `marketplace/${appid}`,
                changed: ["ownLicences"]
              },
              ta
            );

            promises.push(p3);
          }

          await Promise.all(promises);

          return licence.dataValues;
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Integration of external Account failed",
              icon: "bug",
              link: `marketplace/${appid}`,
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

  failedIntegration: requiresAuth.createResolver(
    async (_p, { data }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);
          let appOwned = null;
          let licence = null;

          if (data.manager) {
            appOwned = await models.App.create(
              {
                ...data,
                options: {
                  universallogin: true,
                  pending: true,
                  account: {
                    ...data,
                    buyer: unitid
                  }
                },
                disabled: false,
                color: "#f5f5f5",
                developer: company,
                supportunit: company,
                owner: company
              },
              { transaction: ta }
            );

            await models.Plan.create(
              {
                name: `${data.name} Integrated`,
                appid: appOwned.dataValues.id,
                teaserdescription: `Integrated Plan for ${data.name}`,
                startdate: models.sequelize.fn("NOW"),
                numlicences: 0,
                price: 0.0,
                options: { external: true, integrated: true },
                payperiod: { years: 1 },
                cancelperiod: { secs: 1 },
                hidden: true
              },
              { transaction: ta }
            );
          } else {
            appOwned = await models.App.create(
              {
                ...data,
                options: { universallogin: true },
                disabled: false,
                color: "#f5f5f5",
                developer: company,
                supportunit: company,
                owner: company
              },
              { transaction: ta }
            );

            const plan = await models.Plan.create(
              {
                name: `${data.name} Integrated`,
                appid: appOwned.dataValues.id,
                teaserdescription: `Integrated Plan for ${data.name}`,
                startdate: models.sequelize.fn("NOW"),
                numlicences: 0,
                price: 0.0,
                options: { external: true, integrated: true },
                payperiod: { years: 1 },
                cancelperiod: { secs: 1 },
                hidden: true
              },
              { transaction: ta }
            );

            const boughtPlan = await models.BoughtPlan.create(
              {
                planid: plan.id,
                alias: data.name,
                disabled: true,
                buyer: unitid,
                payer: company,
                usedby: company,
                totalprice: 0,
                key: {
                  integrated: false,
                  external: true,
                  externaltotalprice: 0,
                  loginurl: data.loginurl
                },
                stripeplan: null // Maybe we need one later
              },
              { transaction: ta }
            );

            licence = await models.LicenceData.create(
              {
                unitid,
                disabled: false,
                boughtplanid: boughtPlan.id,
                agreed: true,
                pending: true,
                key: {
                  ...data,
                  external: true,
                  appid: appOwned.dataValues.id,
                  company
                }
              },
              { transaction: ta }
            );
          }
          await sendEmail({
            templateId: "d-58d4a9f85f8c47f88750d379d4fab23a",
            fromName: "VIPFY",
            personalizations: [
              {
                to: [{ email: "support@vipfy.store" }],
                dynamic_template_data: {
                  unitid,
                  company,
                  loginurl: data.loginurl,
                  name: data.name,
                  appid:
                    appOwned && appOwned.dataValues
                      ? appOwned.dataValues.id
                      : -1,
                  licenceid:
                    licence && licence.dataValues ? licence.dataValues.id : -1
                }
              }
            ]
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
  updateLicenceSpeed: requiresAuth.createResolver(
    async (_p, { licenceid, speed, working, oldspeed }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);

          // Check if user is unitid of licence

          const licence = await models.LicenceData.findOne({
            where: { unitid, id: licenceid },
            raw: true
          });

          if (!licence) {
            return false;
          }

          const boughtplan = await models.BoughtPlan.findOne({
            where: { id: licence.boughtplanid },
            raw: true
          });
          const plan = await models.Plan.findOne({
            where: { id: boughtplan.planid },
            raw: true
          });
          const app = await models.App.findOne({
            where: { id: plan.appid },
            raw: true
          });

          if (working) {
            await models.LicenceData.update(
              {
                options: models.sequelize.literal(
                  `options || jsonb '{"loginspeed": ${speed}}'`
                )
              },
              {
                where: { id: licenceid },
                transaction: ta
              }
            );
          } else {
            await models.LicenceData.update(
              {
                options: models.sequelize.literal(
                  `options || jsonb '{"loginfailed": ${speed}}'`
                )
              },
              {
                where: { id: licenceid },
                transaction: ta
              }
            );
          }
          console.log(
            "UPDATE APP",
            `options || jsonb '{"${speed}-${licenceid}-${moment.now()}": ${working}}'`
          );
          await models.App.update(
            {
              options: models.sequelize.literal(
                `options || jsonb '{"${speed}-${licenceid}-${moment.now()}": ${working}}'`
              )
            },
            {
              where: { id: app.id },
              transaction: ta
            }
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

  createAccount: requiresRights(["edit-licences"]).createResolver(
    async (_p, { orbitid, alias, logindata, starttime, endtime }, ctx) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company }
          } = decode(session.token);

          const { models, session } = ctx;

          const orbit = await models.sequelize.query(
            `
            SELECT appid
              FROM boughtplan_data bd JOIN plan_data pd on bd.planid = pd.id
              WHERE bd.id = :orbitid`,
            {
              replacements: { orbitid },
              type: models.sequelize.QueryTypes.SELECT
            }
          );

          const account = await models.LicenceData.create(
            {
              boughtplanid: orbitid,
              agreed: true,
              disabled: false,
              key: {
                ...logindata
              },
              alias,
              starttime,
              endtime
            },
            { transaction: ta }
          );

          const newAccount = await models.Account.findOne({
            where: { id: account.get({ plain: true }).id },
            transaction: ta,
            raw: true
          });

          await createLog(
            ctx,
            "createAccount",
            {
              orbitid,
              alias,
              logindata,
              starttime,
              endtime,
              account,
              newAccount
            },
            ta
          );

          return newAccount;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  changeAccount: requiresRights(["edit-licences"]).createResolver(
    async (_p, { accountid, alias, logindata, starttime, endtime }, ctx) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company }
          } = decode(session.token);

          const { models, session } = ctx;

          await checkLicenceValidilty(models, company, accountid);

          const oldaccount = await models.Account.findOne({
            where: { id: accountid },
            raw: true
          });

          const newaccount = await models.LicenceData.update(
            {
              alias,
              key: {
                ...oldaccount.key,
                ...logindata
              },
              starttime,
              endtime
            },
            {
              where: { id: accountid },
              returning: true,
              transaction: ta,
              raw: true
            }
          );

          const notifications = [];

          oldaccount.assignments.forEach(async assignment => {
            const user = await models.LicenceAssignment.findOne({
              where: { assignmentid: assignment }
            });
            notifications.push(
              createNotification(
                {
                  receiver: user,
                  message: `An account has been updated`,
                  icon: "business-time",
                  link: `dashboard`,
                  changed: ["ownLicences"]
                },
                ta
              )
            );
          });

          await Promise.all(notifications);

          await createLog(
            ctx,
            "changeAccount",
            {
              accountid,
              alias,
              logindata,
              starttime,
              endtime,
              newaccount
            },
            ta
          );

          return { ...oldaccount, ...newaccount[1][0] };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  assignAccount: requiresRights([
    "edit-licences",
    "edit-licenceRights"
  ]).createResolver(
    async (_p, { licenceid, userid, rights, tags, starttime, endtime }, ctx) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);

          const { models, session } = ctx;

          await checkLicenceValidilty(models, company, licenceid);

          await models.LicenceRight.create(
            {
              ...rights,
              ...tags,
              licenceid,
              unitid: userid,
              transaction: ta,
              starttime,
              endtime
            },
            ta
          );

          await createNotification(
            {
              receiver: userid,
              message: `You have been assigned to an account`,
              icon: "business-time",
              link: `dashboard`,
              changed: ["ownLicences"]
            },
            ta
          );

          await createNotification(
            {
              receiver: unitid,
              message: `You have assigned an account`,
              icon: "business-time",
              link: `dashboard`,
              changed: ["companyServices"]
            },
            ta
          );

          await createLog(
            ctx,
            "assignAccount",
            {
              licenceid,
              userid,
              rights,
              tags,
              starttime,
              endtime
            },
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

  createOrbit: requiresRights(["edit-licences"]).createResolver(
    async (_p, { planid, alias, options, starttime, endtime }, ctx) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company }
          } = decode(session.token);

          const { models, session } = ctx;

          const orbit = await models.BoughtPlan.create(
            {
              planid,
              key: {
                ...options
              },
              alias,
              disabled: false,
              buyer: company,
              payer: company,
              usedby: company,
              starttime,
              endtime
            },
            { transaction: ta }
          );

          await createLog(
            ctx,
            "createOrbit",
            {
              planid,
              alias,
              options,
              starttime,
              endtime,
              orbit
            },
            ta
          );

          return orbit;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  changeOrbit: requiresRights(["edit-licences"]).createResolver(
    async (_p, { orbitid, alias, loginurl, starttime, endtime }, ctx) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company }
          } = decode(session.token);

          const { models, session } = ctx;

          await checkOrbitMembership(models, company, orbitid);

          const oldorbit = await models.Orbit.findOne({
            where: { id: orbitid },
            raw: true,
            transaction: ta
          });

          await models.BoughtPlan.update(
            {
              key: {
                ...oldorbit.key,
                loginurl
              },
              alias,
              starttime,
              endtime
            },
            { where: { id: orbitid } },
            { transaction: ta }
          );

          await createLog(
            ctx,
            "changeOrbit",
            {
              orbitid,
              alias,
              loginurl,
              starttime,
              endtime,
              neworbit: {
                ...oldorbit,
                key: {
                  ...oldorbit.key,
                  loginurl
                },
                alias,
                starttime,
                endtime
              }
            },
            ta
          );

          return {
            ...oldorbit,
            key: {
              ...oldorbit.key,
              loginurl
            },
            alias,
            starttime,
            endtime
          };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  terminateAssignAccount: requiresRights([
    "edit-licences",
    "edit-licenceRights"
  ]).createResolver(async (_p, { assignmentid, endtime, isNull }, ctx) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        const { models, session } = ctx;

        const licence = await models.Licence.findOne({
          where: { assignmentid },
          raw: true
        });

        await checkLicenceValidilty(models, company, licence.id);

        let end;
        if (isNull) {
          end = "infinity";
        } else {
          end = endtime || moment.now();
        }

        await models.LicenceRight.update(
          {
            endtime: end
          },
          {
            where: { id: assignmentid },
            transaction: ta
          }
        );

        await createNotification(
          {
            receiver: licence.unitid,
            message: `Your assignment to an account have been terminated`,
            icon: "business-time",
            link: `dashboard`,
            changed: ["ownLicences"]
          },
          ta
        );

        const assignment = await models.LicenceAssignment.findOne({
          where: { assignmentid },
          transaction: ta,
          raw: true
        });

        await createLog(
          ctx,
          "terminateAssignAccount",
          {
            assignmentid,
            endtime,
            isNull
          },
          ta
        );

        return assignment;
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    })
  ),

  createVacation: requiresRights([
    "edit-licences",
    "edit-licenceRights"
  ]).createResolver(
    async (_p, { userid, starttime, endtime, assignments }, ctx) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(session.token);

          const { models, session } = ctx;

          const vacation = await models.Vacation.create(
            {
              unitid: userid,
              starttime,
              endtime
            },
            {
              transaction: ta,
              returning: true
            }
          );

          const promises = [];
          const users = [];
          assignments.forEach(a => {
            if (!users.find(u => u == a.userid)) {
              users.push(a.userid);
            }
            promises.push(
              models.LicenceRight.create(
                {
                  view: true,
                  use: true,
                  tags: ["vacation"],
                  licenceid: a.accountid,
                  unitid: a.userid,
                  starttime,
                  endtime
                },
                ta
              )
            );
          });
          await Promise.all(promises);

          const notifypromises = [];

          users.forEach(u => {
            notifypromises.push(
              createNotification(
                {
                  receiver: u,
                  message: `You have been assigned to an vacation account`,
                  icon: "business-time",
                  link: `dashboard`,
                  changed: ["ownLicences"]
                },
                ta
              )
            );
          });

          await Promise.all(notifypromises);

          await createNotification(
            {
              receiver: unitid,
              message: `You have created an vacation`,
              icon: "business-time",
              link: `dashboard`,
              changed: ["companyServices"]
            },
            ta
          );

          await createLog(
            ctx,
            "createVacation",
            {
              userid,
              starttime,
              endtime,
              assignments
            },
            ta
          );

          return vacation;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),
  sendSupportRequest: requiresAuth.createResolver(
    async (_p, args, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company: companyID }
          } = decode(session.token);
          const { topic, description, component, internal } = args;

          const p1 = models.User.findOne({
            where: { id: unitid },
            raw: true,
            transaction: ta
          });

          const p2 = models.Department.findOne({
            where: { unitid: companyID },
            raw: true,
            transaction: ta
          });

          const [user, company] = await Promise.all([p1, p2]);

          if (!company.supportid) {
            const { data } = await freshdeskAPI("POST", "companies", {
              name: `25${company.name}-${company.unitid}`
            });

            await models.DepartmentData.update(
              { supportid: data.id },
              { where: { unitid: company.unitid } }
            );

            company.supportid = data.id;
          }

          if (!user.supporttoken) {
            const { data } = await freshdeskAPI("POST", "contacts", {
              name: concatName(user),
              email: user.emails[0],
              company_id: company.supportid
            });

            await models.Human.update(
              { supporttoken: data.id },
              { where: { unitid } }
            );

            user.supporttoken = data.id;

            freshdeskAPI("PUT", `contacts/${data.id}/send_invite`);
          }

          await freshdeskAPI("POST", "tickets", {
            requester_id: user.supporttoken,
            subject: `${component} - ${topic}`,
            type: internal ? "VIPFY" : "External App",
            description,
            source: 1,
            status: 2,
            priority: 2
          });

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
