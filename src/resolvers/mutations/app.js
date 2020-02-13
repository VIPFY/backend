import { decode } from "jsonwebtoken";
import moment from "moment";
import { NormalError } from "../../errors";
import {
  requiresRights,
  requiresAuth,
  requiresVipfyAdmin
} from "../../helpers/permissions";
import {
  createLog,
  createNotification,
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
  checkLicenceValidilty,
  checkOrbitMembership
} from "../../helpers/companyMembership";
import { sendEmail } from "../../helpers/email";
import freshdeskAPI from "../../services/freshdesk";
/* eslint-disable no-return-await */

export default {
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
    async (_p, { assignmentid, minutes }, { models, session }) => {
      try {
        if (minutes <= 0) {
          throw new Error("minutes must be positive");
        }

        const {
          user: { unitid }
        } = decode(session.token);
        const licence = await models.Licence.findOne({
          where: { assignmentid, unitid },
          raw: true
        });
        if (!licence) {
          throw new Error("licence not found");
        }
        await models.sequelize.query(
          `INSERT INTO timetracking_data (assignmentid, licenceid, unitid, boughtplanid, day, minutesspent)
            VALUES (:assignmentid, :licenceid, :unitid, :boughtplanid, now(), :minutesspent)
            ON CONFLICT (assignmentid, unitid, day)
            DO UPDATE SET minutesspent = timetracking_data.minutesspent + EXCLUDED.minutesspent
            `,
          {
            replacements: {
              assignmentid,
              licenceid: licence.id,
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

          const oldBoughtPlan = await models.BoughtPlanView.findOne({
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
            LEFT OUTER JOIN boughtplan_view bd on ld.boughtplanid = bd.id
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

  createOwnApp: requiresRights(["create-licences"]).createResolver(
    async (_p, { ssoData }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company }
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
          return { appid: appOwned.id, planid: plan.id };
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
            FROM boughtplan_view bd
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

        const app = await models.App.findOne({
          where: { id: serviceid },
          raw: true,
          transaction: ta
        });

        if (app.owner == company) {
          await models.App.update(
            { disabled: true },
            { where: { id: serviceid }, transaction: ta }
          );
        }

        const notifiyUsers = [];

        await Promise.all(
          boughtPlans.map(async boughtPlan => {
            const endtime = parsedTime;

            const oldperiod = await models.BoughtPlanPeriodView.findOne({
              where: { boughtplanid: boughtPlan.id },
              raw: true,
              transaction: ta
            });

            await models.BoughtPlanPeriod.update(
              {
                endtime
              },
              { where: { id: oldperiod.id }, transaction: ta }
            );

            const oldAccounts = await models.LicenceData.update(
              {
                endtime
              },
              {
                where: { boughtplanid: boughtPlan.id, endtime: null },
                returning: true,
                transaction: ta,
                raw: true
              }
            );

            const oldassignments = await models.LicenceRight.update(
              {
                endtime
              },
              {
                where: {
                  licenceid: oldAccounts[1].map(oa => oa.id),
                  endtime: {
                    [models.Op.or]: {
                      [models.Op.gt]: endtime,
                      [models.Op.eq]: Infinity
                    }
                  }
                },
                returning: true,
                transaction: ta,
                raw: true
              }
            );

            if (oldassignments[1]) {
              oldassignments[1].forEach(oas => {
                if (!notifiyUsers.find(nu => nu == oas.unitid)) {
                  notifiyUsers.push(oas.unitid);
                }
              });
            }

            await models.DepartmentApp.update(
              {
                endtime
              },
              {
                where: { boughtplanid: boughtPlan.id, endtime: Infinity },
                transaction: ta
              }
            );
          })
        );

        // NOTIFY USERS
        if (notifiyUsers) {
          await Promise.all(
            notifiyUsers.map(nu =>
              createNotification(
                {
                  receiver: nu,
                  message: `An account has been updated`,
                  icon: "business-time",
                  link: `dashboard`,
                  changed: ["ownLicences"]
                },
                ta
              )
            )
          );
        }

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
                options: { universallogin: true, pending: true, ...data },
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

  //Not used at the moment - maybe for late use
  updateLicenceSpeed: requiresAuth.createResolver(
    async (_p, { licenceid, speed, working, oldspeed }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(session.token);

          // Check if user is unitid of licence

          const licence = await models.Licence.findOne({
            where: { unitid, id: licenceid },
            raw: true
          });

          if (!licence) {
            return false;
          }

          const boughtplan = await models.BoughtPlanView.findOne({
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

  // New Service - Orbit - Account - Assignment - Stuff
  createAccount: requiresRights(["myself", "edit-licences"]).createResolver(
    async (_p, { orbitid, alias, logindata, starttime, endtime }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models } = ctx;

          await models.sequelize.query(
            `
            SELECT appid
              FROM boughtplan_view bd JOIN plan_data pd on bd.planid = pd.id
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
              key: { ...logindata },
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
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company }
          } = decode(ctx.session.token);

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

          if (endtime) {
            const oldassignments = await models.LicenceRight.update(
              {
                endtime
              },
              {
                where: {
                  licenceid: accountid,
                  endtime: {
                    [models.Op.or]: {
                      [models.Op.gt]: endtime,
                      [models.Op.eq]: Infinity
                    }
                  }
                },
                returning: true,
                transaction: ta,
                raw: true
              }
            );

            if (oldassignments[1]) {
              await Promise.all(
                oldassignments[1].map(oas =>
                  createNotification(
                    {
                      receiver: oas.unitid,
                      message: `An account has been updated`,
                      icon: "business-time",
                      link: `dashboard`,
                      changed: ["ownLicences"]
                    },
                    ta
                  )
                )
              );
            }
          }

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
    async (
      _p,
      { licenceid, userid, rights, tags, starttime, endtime, keyfragment },
      ctx
    ) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(ctx.session.token);

          const { models, session } = ctx;

          await checkLicenceValidilty(models, company, licenceid);

          const licence = await models.LicenceData.findOne({
            where: { id: licenceid },
            transaction: ta
          });
          if (licence.key.encrypted && keyfragment) {
            licence.key = {
              ...licence.key,
              encrypted: [...licence.dataValues.key.encrypted, keyfragment]
            };
            await licence.save({ transaction: ta });
          } else if (licence.key.encrypted && !keyfragment) {
            throw new Error("can't add unencrypted user to encrypted licence");
          }

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

  createOrbit: requiresRights(["myself", "edit-licences"]).createResolver(
    async (_p, { planid, alias, options, starttime, endtime }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company, unitid }
          } = decode(ctx.session.token);

          const { models } = ctx;

          const orbit = await models.BoughtPlan.create(
            {
              payer: company,
              usedby: company,
              disabled: false,
              alias,
              key: {
                ...options
              }
            },
            { transaction: ta }
          );

          await models.BoughtPlanPeriod.create(
            {
              boughtplanid: orbit.id,
              planid,
              payer: company,
              creator: unitid,
              totalprice: 0,
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

          const fullorbit = await models.BoughtPlanView.findOne({
            where: { id: orbit.id },
            raw: true,
            transaction: ta
          });

          return fullorbit;
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
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company, unitid }
          } = decode(ctx.session.token);

          const { models } = ctx;

          if (orbitid == 66) {
            // Don't let people change the VIPFY App Orbit
            throw new Error("You can't change this orbit!");
          }

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
                domain: loginurl
              },
              alias
            },
            { where: { id: orbitid }, transaction: ta }
          );

          const oldperiod = await models.BoughtPlanPeriodView.findOne({
            where: { boughtplanid: orbitid },
            raw: true,
            transaction: ta
          });

          await models.BoughtPlanPeriod.update(
            {
              starttime,
              endtime,
              creator: unitid
            },
            { where: { boughtplanid: orbitid }, transaction: ta }
          );

          if (endtime) {
            const oldAccounts = await models.LicenceData.update(
              {
                endtime
              },
              {
                where: { id: oldperiod.id },
                returning: true,
                transaction: ta,
                raw: true
              }
            );

            const oldassignments = await models.LicenceRight.update(
              {
                endtime
              },
              {
                where: {
                  licenceid: oldAccounts[1].map(oa => oa.id),
                  endtime: {
                    [models.Op.or]: {
                      [models.Op.gt]: endtime,
                      [models.Op.eq]: Infinity
                    }
                  }
                },
                returning: true,
                transaction: ta,
                raw: true
              }
            );

            if (oldassignments[1]) {
              await Promise.all(
                oldassignments[1].map(oas =>
                  createNotification(
                    {
                      receiver: oas.unitid,
                      message: `An account has been updated`,
                      icon: "business-time",
                      link: `dashboard`,
                      changed: ["ownLicences"]
                    },
                    ta
                  )
                )
              );
            }
          }

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
    ctx.models.sequelize.transaction(async ta => {
      try {
        const {
          user: { company }
        } = decode(ctx.session.token);

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
            message: `Your assignment to an account has been terminated`,
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
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(ctx.session.token);

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
            // if (!users.find(u => u == a.userid)) {
            users.push(a.userid);
            // }
            promises.push(
              models.LicenceRight.create(
                {
                  view: true,
                  use: true,
                  tags: ["vacation"],
                  licenceid: a.accountid,
                  unitid: a.userid,
                  starttime,
                  endtime,
                  options: { vacationid: vacation.id }
                },
                { transaction: ta, returning: true }
              )
            );
          });

          const vacationLicences = await Promise.all(promises);

          const notifypromises = [];

          const options = [];
          const sended = [];
          users.forEach((u, k) => {
            options.push({
              userid: u,
              assignmentid: vacationLicences[k].id,
              originalassignment: assignments[k].originalassignment,
              accountid: vacationLicences[k].licenceid
            });

            if (!sended.find(s => u)) {
              sended.push(u);
              notifypromises.push(
                createNotification(
                  {
                    receiver: u,
                    message: `You have been assigned to a vacation account`,
                    icon: "business-time",
                    link: `dashboard`,
                    changed: ["ownLicences"]
                  },
                  ta
                )
              );
            }
          });

          await Promise.all(notifypromises);

          await models.Vacation.update(
            {
              options
            },
            {
              where: { id: vacation.id },
              transaction: ta
            }
          );

          await createNotification(
            {
              receiver: unitid,
              message: `You have created a vacation`,
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
  editVacation: requiresRights([
    "edit-licences",
    "edit-licenceRights"
  ]).createResolver(
    async (_p, { vacationid, starttime, endtime, assignments }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(ctx.session.token);

          const { models, session } = ctx;

          let vacation = await models.Vacation.update(
            {
              starttime,
              endtime
            },
            {
              where: { id: vacationid },
              transaction: ta,
              returning: true
            }
          );

          const promises = [];
          const oldpromises = [];
          const users = [];
          const oldusers = [];
          assignments.forEach(a => {
            if (!users.find(u => u == a.userid)) {
              users.push(a.userid);
            }
            if (!oldusers.find(u => u == a.olduserid)) {
              oldusers.push(a.olduserid);
            }
            oldpromises.push(
              models.LicenceRight.update(
                {
                  endtime: models.sequelize.fn("NOW")
                },
                {
                  where: {
                    id: vacation[1][0].options.find(
                      o => o.originalassignment == a.assignmentid
                    ).assignmentid
                  },
                  transaction: ta
                }
              )
            );
            if (a.userid != "") {
              promises.push(
                models.LicenceRight.create(
                  {
                    view: true,
                    use: true,
                    tags: ["vacation"],
                    licenceid: a.accountid,
                    unitid: a.userid,
                    starttime: starttime || vacation[1][0].starttime,
                    endtime: endtime || vacation[1][0].endtime,
                    options: { vacationid }
                  },
                  { transaction: ta, returning: true }
                )
              );
            }
          });

          const vacationLicences = await Promise.all(promises);
          await Promise.all(oldpromises);

          const notifypromises = [];

          // Line up assignments and vacation options
          const { options } = vacation[1][0];
          let emptyAssignments = 0;
          assignments.forEach((a, k) => {
            options.find(o => o.originalassignment == a.assignmentid).userid =
              a.userid;
            if (a.userid != "") {
              options.find(
                o => o.originalassignment == a.assignmentid
              ).assignmentid = vacationLicences[k - emptyAssignments].id;
            } else {
              emptyAssignments++;
            }
          });
          users.forEach((u, k) => {
            notifypromises.push(
              createNotification(
                {
                  receiver: u,
                  message: `You have been assigned to a vacation account`,
                  icon: "business-time",
                  link: `dashboard`,
                  changed: ["ownLicences"]
                },
                ta
              )
            );
          });

          // Notify old users because of remove

          oldusers.forEach((u, k) => {
            notifypromises.push(
              createNotification(
                {
                  receiver: u,
                  message: `You have been unassigned from a vacation account`,
                  icon: "business-time",
                  link: `dashboard`,
                  changed: ["ownLicences"]
                },
                ta
              )
            );
          });

          await Promise.all(notifypromises);

          vacation = await models.Vacation.update(
            {
              options
            },
            {
              where: { id: vacationid },
              transaction: ta,
              returning: true
            }
          );

          await createNotification(
            {
              receiver: unitid,
              message: `You have updated a vacation`,
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
              unitid,
              starttime,
              endtime,
              assignments
            },
            ta
          );

          return vacation[1][0];
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
      ctx.models.sequelize.transaction(async ta => {
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
  ),
  saveExecutionPlan: requiresVipfyAdmin.createResolver(
    async (_p, { appid, key, script }, { models, session }) => {
      try {
        await models.sequelize.query(
          `
          Update app_data set internaldata = jsonb_insert(internaldata, '{execute, -1}', :scriptblock)
          WHERE id = :appid;
        `,
          {
            replacements: {
              appid,
              scriptblock: JSON.stringify({ key, script })
            },
            raw: true
          }
        );
        const app = await models.sequelize.query(
          `
          SELECT * 
          FROM app_data
          WHERE internaldata -> 'execute' is not null
          ${appid ? " AND id = :appid" : ""};
        `,
          {
            replacements: { appid },
            raw: true,
            type: models.sequelize.QueryTypes.SELECT
          }
        );
        return app[0];
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
