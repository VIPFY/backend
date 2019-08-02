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
import { uploadAppImage } from "../../services/aws";
import { checkAuthentification } from "../../helpers/auth";
import { checkCompanyMembership } from "../../helpers/companyMembership";
import { sendEmail } from "../../helpers/email";

/* eslint-disable no-return-await */

export default {
  distributeLicence: requiresRights(["create-licences"]).createResolver(
    (_parent, { licenceid, unitid, departmentid }, context) =>
      context.models.sequelize.transaction(async ta => {
        const { models, token } = context;
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

          const p3 = models.LicenceData.update(
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
              message: `Licence distributed to ${user.firstname} ${
                user.lastname
              }`,
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
        const { models, token } = context;

        try {
          const {
            user: { unitid }
          } = decode(token);

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
    (_p, { alias, appid, price, loginurl }, context) =>
      context.models.sequelize.transaction(async ta => {
        const { models, token } = context;

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
      const { models, token } = context;

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

  deleteServiceLicenceAt: requiresRights(["delete-licences"]).createResolver(
    async (_p, { serviceid, licenceid, time }, context) =>
      context.models.sequelize.transaction(async ta => {
        const { models, token } = context;

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
      const { models, token } = context;

      const parsedTime = moment(time).valueOf();
      const config = { endtime: parsedTime };
      await models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

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
          const { models, token } = context;
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

  updateCredentials: requiresAuth.createResolver(async (_p, args, context) =>
    context.models.sequelize.transaction(async ta => {
      const { models, token } = context;

      try {
        const {
          user: { unitid, company }
        } = decode(token);
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
    async (_, { layout }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

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

        return true;
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    }
  ),

  createOwnApp: requiresRights(["create-licences"]).createResolver(
    async (_, { ssoData, userids }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);
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
          let licence = null;
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

          return licence;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  giveTemporaryAccess: requiresRights(["edit-licenceRights"]).createResolver(
    async (_, { licences }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company }
          } = decode(token);

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

  deleteService: requiresAuth.createResolver(
    async (_p, { serviceid, time }, context) =>
      context.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = context;

          const {
            user: { unitid, company }
          } = decode(token);

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
            throw new Error(
              "BoughtPlan doesn't exist or isn't active anymore!"
            );
          }

          const updatePromises = [];
          const licencePromises = [];
          const departmentPromisies = [];
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

            departmentPromisies.push(
              models.DepartmentApp.destroy(
                { where: { boughtplanid: boughtPlan.id } },
                { transaction: ta }
              )
            );
          });

          await Promise.all(
            updatePromises,
            licencePromises,
            departmentPromisies
          );

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

  distributeLicence10: requiresAuth.createResolver(
    async (_p, { licenceid, userid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models } = ctx;
          const distribute = await models.LicenceData.update(
            {
              unitid: userid
            },
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
        const { models, token } = ctx;
        const {
          user: { unitid, company }
        } = decode(token);
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
              message: `${admin.firstname} ${
                admin.lastname
              } integrated an external Account for you.`,
              icon: "user-plus",
              link: `marketplace/${appid}`,
              changed: ["ownLicences"]
            },
            ta
          );

          promises.push(p3);
        }

        await Promise.all(promises);

        return true;
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
    async (_, { data }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const appOwned = await models.App.create(
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

          const licence = await models.LicenceData.create(
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
                  appid: appOwned.dataValues.id,
                  licenceid: licence.dataValues.id
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
  )
};
