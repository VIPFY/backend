import { decode } from "jsonwebtoken";
import moment from "moment";
import fs from "fs";
import path from "path";
import { NormalError, VIPFYPlanLimit, VIPFYPlanError } from "../../errors";
import {
  requiresRights,
  requiresAuth,
  requiresVipfyAdmin,
} from "../../helpers/permissions";
import {
  createLog,
  createNotification,
  concatName,
  formatFilename,
} from "../../helpers/functions";
import { checkVipfyPlanAssignments } from "../../helpers/billing";
// import {
//   addSubscriptionItem,
//   abortSubscription,
//   cancelPurchase
// } from "../../services/stripe";
import { uploadAppImage } from "../../services/aws";
import {
  checkLicenceValidity,
  checkOrbitMembership,
} from "../../helpers/companyMembership";
import { sendEmail } from "../../helpers/email";
import freshdeskAPI from "../../services/freshdesk";
/* eslint-disable no-return-await */

export default {
  agreeToLicence: requiresAuth.createResolver(
    (_parent, { licenceid }, context) =>
      context.models.sequelize.transaction(async ta => {
        const { models } = context;

        try {
          const updatedLicence = await models.LicenceData.update(
            { agreed: true },
            {
              where: { id: licenceid },
              returning: true,
              transaction: ta,
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
            internalData: { err },
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
          user: { unitid },
        } = decode(session.token);
        const licence = await models.Licence.findOne({
          where: { assignmentid, unitid },
          raw: true,
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
              minutesspent: minutes,
            },
            type: models.sequelize.QueryTypes.INSERT,
          }
        );
        return { ok: true };
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err },
        });
      }
    }
  ),

  /*deprecated*/
  deleteLicenceAt: requiresRights(["delete-licences"]).createResolver(
    async (_, { licenceid, time }, context) => {
      const { models, session } = context;

      const parsedTime = moment(time).valueOf();
      const config = { endtime: parsedTime };
      await models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
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
              type: models.sequelize.QueryTypes.SELECT,
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
            transaction: ta,
          });

          await models.LicenceRight.update(config, {
            where: { licenceid: licence[0].id },
            transaction: ta,
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
              changed: ["ownLicences"],
            },
            ta
          );

          await Promise.all([p1, p2]);
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      });
      return moment(config.endtime).toDate();
    }
  ),

  voteForApp: requiresAuth.createResolver(
    async (parent, { app }, { models, session }) => {
      const {
        user: { unitid },
      } = decode(session.token);
      try {
        await models.AppVote.create({ unitid, app });
        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  sendDownloadLink: async (_p, { email, isMac }) => {
    try {
      if (isMac) {
        await sendEmail({
          templateId: "d-e31dc52fbac54edba50f3e6586a714bb",
          fromName: "VIPFY",
          personalizations: [
            {
              to: [{ email: "office@vipfy.store" }],
              dynamic_template_data: { email },
            },
          ],
        });
      } else {
        await Promise.all([
          sendEmail({
            templateId: "d-dbe6fd61bc654b81b036cfced48f2066",
            fromName: "VIPFY",
            personalizations: [{ to: [{ email }], dynamic_template_data: {} }],
          }),
          sendEmail({
            templateId: "d-435a368f329e44439276369335c3d019",
            fromName: "VIPFY Link Bot",
            personalizations: [
              {
                to: [{ email: "office@vipfy.store" }],
                dynamic_template_data: { email },
              },
            ],
          }),
        ]);
      }
      console.log("Serverlogs", `Sent download link to ${email}`);

      return true;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  createOwnApp: requiresRights(["myself", "create-licences"]).createResolver(
    async (_p, { ssoData }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(session.token);
          const { images, loginurl, ...data } = ssoData;

          let appOwned = null;

          if (images && images.length == 2) {
            const [logo, icon] = await Promise.all(
              images.map(async (upload, index) => {
                const pic = await upload;
                const filename = formatFilename(index == 0 ? "logo" : "icon");

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
                options: { type: "universalLogin" },
                disabled: false,
                developer: company,
                supportunit: company,
                owner: company,
              },
              { transaction: ta }
            );
          } else {
            appOwned = await models.App.create(
              {
                ...data,
                loginurl,
                options: { type: "universalLogin" },
                disabled: false,
                developer: company,
                supportunit: company,
                owner: company,
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
            },
            { transaction: ta }
          );

          await createNotification(
            {
              receiver: unitid,
              message: `User ${unitid} has created a new app called Service ${appOwned.dataValues.id}`,
              icon: "plus",
              link: "servicemanager",
              changed: ["companyServices", "ownLicences"],
              level: 3,
            },
            ta,
            { company, level: 3 }
          );
          return { appid: appOwned.id, planid: plan.id };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  deleteService: requiresRights([
    ["delete-licences, delete-boughtplans"],
  ]).createResolver(async (_p, { serviceid, time }, context) =>
    context.models.sequelize.transaction(async ta => {
      try {
        const { models, session } = context;

        const {
          user: { unitid, company },
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
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
        const notifiyUsers = [];

        if (boughtPlans.length < 1) {
          const pendingApps = await models.sequelize.query(
            `
              SELECT id, options
              FROM app_data
              WHERE owner = :company
                and id = :serviceid`,
            {
              replacements: { company, serviceid },
              type: models.sequelize.QueryTypes.SELECT,
            }
          );
          if (pendingApps.length < 1) {
            throw new Error(
              "BoughtPlan doesn't exist or isn't active anymore!"
            );
          }

          const newoptions = {
            ...pendingApps[0].options,
            pending: undefined,
            removed: true,
          };

          await models.App.update(
            {
              options: newoptions,
              disabled: true,
              hidden: true,
            },
            { where: { id: serviceid }, transaction: ta }
          );
        } else {
          const app = await models.App.findOne({
            where: { id: serviceid },
            raw: true,
            transaction: ta,
          });

          if (app.owner == company) {
            await models.App.update(
              { disabled: true },
              { where: { id: serviceid }, transaction: ta }
            );
          }

          await Promise.all(
            boughtPlans.map(async boughtPlan => {
              const endtime = parsedTime;

              const oldperiod = await models.BoughtPlanPeriodView.findOne({
                where: { boughtplanid: boughtPlan.id },
                raw: true,
                transaction: ta,
              });

              await models.BoughtPlanPeriod.update(
                {
                  endtime,
                },
                { where: { id: oldperiod.id }, transaction: ta }
              );

              const oldAccounts = await models.LicenceData.update(
                {
                  endtime,
                },
                {
                  where: { boughtplanid: boughtPlan.id, endtime: null },
                  returning: true,
                  transaction: ta,
                  raw: true,
                }
              );

              const oldassignments = await models.LicenceRight.update(
                {
                  endtime,
                },
                {
                  where: {
                    licenceid: oldAccounts[1].map(oa => oa.id),
                    endtime: {
                      [models.Op.or]: {
                        [models.Op.gt]: endtime,
                        [models.Op.eq]: Infinity,
                      },
                    },
                  },
                  returning: true,
                  transaction: ta,
                  raw: true,
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
                  endtime,
                },
                {
                  where: { boughtplanid: boughtPlan.id, endtime: Infinity },
                  transaction: ta,
                }
              );
            })
          );
        }
        await createNotification(
          {
            message: time
              ? `User ${unitid} has set Service ${serviceid} to expire at ${moment(
                  time
                ).toDate()}`
              : `User ${unitid} has removed Service ${serviceid}`,
            icon: "business-time",
            link: `dashboard`,
            changed: [
              "ownLicences",
              "companyServices",
              "companyServices",
              "foreignLicences",
            ],
          },
          ta,
          { company },
          null,
          { users: notifiyUsers, level: 3 }
        );

        await createLog(context, "deleteService", { serviceid }, ta);

        return true;
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err },
        });
      }
    })
  ),

  failedIntegration: requiresAuth.createResolver(
    async (_p, { data }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(session.token);
          let appOwned = null;
          let licence = null;
          let logo = undefined;
          let icon = undefined;

          if (data.squareImages && data.squareImages.length == 2) {
            [logo, icon] = await Promise.all(
              data.squareImages.map(async (upload, index) => {
                const pic = await upload;
                const filename = formatFilename(index == 0 ? "logo" : "icon");
                const name = await uploadAppImage(pic, data.name, filename);
                return name;
              })
            );
          }

          if (data.manager) {
            appOwned = await models.App.create(
              {
                ...data,
                options: {
                  type: "universalLogin",
                  pending: true,
                  account: {
                    ...data,
                    buyer: unitid,
                  },
                },
                disabled: false,
                color: "#f5f5f5",
                developer: company,
                supportunit: company,
                owner: company,
                logo,
                icon,
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
              },
              { transaction: ta }
            );
          } else {
            appOwned = await models.App.create(
              {
                ...data,
                options: { type: "universalLogin", pending: true, ...data },
                disabled: false,
                color: "#f5f5f5",
                developer: company,
                supportunit: company,
                owner: company,
                logo,
                icon,
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
                    licence && licence.dataValues ? licence.dataValues.id : -1,
                },
              },
            ],
          });

          await createNotification(
            {
              receiver: unitid,
              message: `User ${unitid} has added a pending service`,
              icon: "business-time",
              link: `dashboard`,
              changed: ["companyServices"],
              level: 1,
            },
            ta,
            { company, level: 1 }
          );

          return appOwned.dataValues.id;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),
  requestIntegration: requiresAuth.createResolver(
    async (_p, { data }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(session.token);

          const { startUrl, serviceName, trackedPlan, finalUrl, color } = data;
          let appOwned = null;
          let planId = null;

          let logo = undefined;
          let icon = undefined;

          if (data.squareImages && data.squareImages.length == 2) {
            [logo, icon] = await Promise.all(
              data.squareImages.map(async (upload, index) => {
                const pic = await upload;
                const filename = formatFilename(index == 0 ? "logo" : "icon");
                const name = await uploadAppImage(pic, serviceName, filename);
                return name;
              })
            );
          }
          if (data.manager) {
            appOwned = await models.App.create(
              {
                name: serviceName,
                options: {
                  pending: true,
                  integrated: {
                    ...data,
                  },
                },
                disabled: false,
                color: color || "#f5f5f5",
                developer: company,
                supportunit: company,
                owner: company,
                logo,
                icon,
              },
              { transaction: ta }
            );

            planId = await models.Plan.create(
              {
                name: `${data.serviceName} Integrated`,
                appid: appOwned.dataValues.id,
                teaserdescription: `Integrated Plan for ${data.serviceName}`,
                startdate: models.sequelize.fn("NOW"),
                numlicences: 0,
                price: 0.0,
                options: { external: true, integrated: true },
                payperiod: { years: 1 },
                cancelperiod: { secs: 1 },
              },
              { transaction: ta }
            );
          } else {
            appOwned = await models.App.create(
              {
                name: serviceName,
                options: {
                  pending: true,
                  integrated: {
                    ...data,
                  },
                },
                disabled: false,
                color: color || "#f5f5f5",
                developer: company,
                supportunit: company,
                owner: company,
                logo,
                icon,
              },
              { transaction: ta }
            );

            planId = await models.Plan.create(
              {
                name: `${serviceName} Integrated`,
                appid: appOwned.dataValues.id,
                teaserdescription: `Integrated Plan for ${serviceName}`,
                startdate: models.sequelize.fn("NOW"),
                numlicences: 0,
                price: 0.0,
                options: { external: true, integrated: true },
                payperiod: { years: 1 },
                cancelperiod: { secs: 1 },
              },
              { transaction: ta }
            );
          }

          await createNotification(
            {
              receiver: unitid,
              title: `Integration of ${serviceName}`,
              message: "",
              icon: "code-branch",
              link: `serviceManager`,
              changed: ["companyServices"],
              level: 3,
              options: {
                autoclose: false,
                closeable: false,
                notificationType: "RequestedIntegration",
                data: {
                  startUrl,
                  trackedPlan,
                  finalUrl,
                  appId: appOwned.dataValues.id,
                  planId: planId.dataValues.id,
                  manager: data.manager,
                  serviceName,
                },
              },
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

  confirmIntegration: requiresAuth.createResolver(
    async (_p, { data }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(session.token);

          const { loginUrl, options, internalData, appId } = data;
          await models.App.update(
            {
              options,
              internaldata: internalData,
              loginurl: loginUrl,
            },
            {
              where: { id: appId },
              transaction: ta,
            }
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

  sendFailedIntegrationRequest: requiresAuth.createResolver(
    async (_p, { appid }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(session.token);

          const app = await models.App.findOne({ where: { id: appid } });

          await sendEmail({
            templateId: "d-58d4a9f85f8c47f88750d379d4fab23a",
            fromName: "VIPFY",
            personalizations: [
              {
                to: [{ email: "support@vipfy.store" }],
                dynamic_template_data: {
                  unitid,
                  company,
                  loginurl: app.loginurl,
                  name: app.name,
                  appid,
                  licenceid: -1,
                },
              },
            ],
          });
          return true;
        } catch (err) {
          console.log("ERROR", err);
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  // Not used at the moment - maybe for late use
  updateLicenceSpeed: requiresAuth.createResolver(
    async (_p, { licenceid, speed, working, oldspeed }, { models, session }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(session.token);

          // Check if user is unitid of licence

          const licence = await models.Licence.findOne({
            where: { unitid, id: licenceid },
            raw: true,
          });

          if (!licence) {
            return false;
          }

          const boughtplan = await models.BoughtPlanView.findOne({
            where: { id: licence.boughtplanid },
            raw: true,
          });
          const plan = await models.Plan.findOne({
            where: { id: boughtplan.planid },
            raw: true,
          });
          const app = await models.App.findOne({
            where: { id: plan.appid },
            raw: true,
          });

          if (working) {
            await models.LicenceData.update(
              {
                options: models.sequelize.literal(
                  `options || jsonb '{"loginspeed": ${speed}}'`
                ),
              },
              {
                where: { id: licenceid },
                transaction: ta,
              }
            );
          } else {
            await models.LicenceData.update(
              {
                options: models.sequelize.literal(
                  `options || jsonb '{"loginfailed": ${speed}}'`
                ),
              },
              {
                where: { id: licenceid },
                transaction: ta,
              }
            );
          }

          await models.App.update(
            {
              options: models.sequelize.literal(
                `options || jsonb '{"${speed}-${licenceid}-${moment.now()}": ${working}}'`
              ),
            },
            {
              where: { id: app.id },
              transaction: ta,
            }
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

  // New Service - Orbit - Account - Assignment - Stuff
  createAccount: requiresRights(["myself", "edit-licences"]).createResolver(
    async (
      _p,
      { orbitid, alias, logindata, starttime, endtime, options },
      ctx
    ) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models } = ctx;
          const {
            user: { unitid, company },
          } = decode(ctx.session.token);

          await models.sequelize.query(
            `
            SELECT appid
              FROM boughtplan_view bd JOIN plan_data pd on bd.planid = pd.id
              WHERE bd.id = :orbitid`,
            {
              replacements: { orbitid },
              type: models.sequelize.QueryTypes.SELECT,
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
              endtime,
              options: { ...options },
            },
            { transaction: ta }
          );

          const newAccount = await models.Account.findOne({
            where: { id: account.get({ plain: true }).id },
            transaction: ta,
            raw: true,
          });

          await createNotification(
            {
              receiver: unitid,
              message: `User ${unitid} has added Account ${
                account.get({ plain: true }).id
              }`,
              icon: "business-time",
              link: `dashboard`,
              changed: [
                "ownLicences",
                "companyServices",
                "foreignLicences",
                "semiPublicUser",
              ],
              level: 1,
            },
            ta,
            { company, level: 1 }
          );

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
              newAccount,
            },
            ta
          );

          return newAccount;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  changeAccount: requiresRights(["edit-licences"]).createResolver(
    async (
      _p,
      { accountid, alias, logindata, starttime, endtime, options },
      ctx
    ) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(ctx.session.token);

          const { models, session } = ctx;

          await checkLicenceValidity(models, company, accountid);

          const oldaccount = await models.Account.findOne({
            where: { id: accountid },
            raw: true,
          });

          const newaccount = await models.LicenceData.update(
            {
              alias,
              key: {
                ...oldaccount.key,
                ...logindata,
              },
              starttime,
              endtime,
              options: {
                ...oldaccount.options,
                ...options,
              },
            },
            {
              where: { id: accountid },
              returning: true,
              transaction: ta,
              raw: true,
            }
          );

          const users = await models.LicenceRight.findAll({
            where: {
              licenceid: accountid,
              endtime: {
                [models.Op.or]: {
                  [models.Op.gt]: endtime,
                  [models.Op.eq]: Infinity,
                },
              },
            },
            returning: true,
            transaction: ta,
            raw: true,
          });

          if (endtime) {
            const oldassignments = await models.LicenceRight.update(
              {
                endtime,
              },
              {
                where: {
                  licenceid: accountid,
                  endtime: {
                    [models.Op.or]: {
                      [models.Op.gt]: endtime,
                      [models.Op.eq]: Infinity,
                    },
                  },
                },
                returning: true,
                transaction: ta,
                raw: true,
              }
            );
          }

          await createNotification(
            {
              message: `User ${unitid} has change Account ${accountid}`,
              icon: "business-time",
              link: `dashboard`,
              changed: [
                "ownLicences",
                "companyServices",
                "foreignLicences",
                "semiPublicUser",
              ],
              level: 1,
            },
            ta,
            { company, level: 1 },
            null,
            { users: users.map(u => u.id), level: 1 }
          );

          await createLog(
            ctx,
            "changeAccount",
            {
              accountid,
              alias,
              logindata,
              starttime,
              endtime,
              newaccount,
            },
            ta
          );

          return { ...oldaccount, ...newaccount[1][0] };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  assignAccount: requiresRights([
    ["myself", "edit-licences", "edit-licenceRights"],
  ]).createResolver(
    async (
      _p,
      { licenceid, userid, rights, tags, starttime, endtime, keyfragment },
      ctx
    ) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(ctx.session.token);

          const { models } = ctx;

          await checkLicenceValidity(models, company, licenceid);
          await checkVipfyPlanAssignments({ userid, transaction: ta });

          const licence = await models.LicenceData.findOne({
            where: { id: licenceid },
            transaction: ta,
          });

          if (licence.key.encrypted && keyfragment) {
            licence.key = {
              ...licence.key,
              encrypted: [...licence.dataValues.key.encrypted, keyfragment],
            };
            await licence.save({ transaction: ta });
          } else if (licence.key.encrypted && !keyfragment) {
            throw new Error("can't add unencrypted user to encrypted licence");
          }

          await Promise.all([
            models.LicenceRight.create(
              {
                ...rights,
                ...tags,
                licenceid,
                unitid: userid,
                transaction: ta,
                starttime,
                endtime,
              },
              ta
            ),
            await createNotification(
              {
                receiver: userid,
                message: starttime
                  ? `User ${unitid} has assigned Account ${licenceid} to User ${unitid} starting at ${moment(
                      starttime
                    ).toDate()}`
                  : `User ${unitid} has assigned Account ${licenceid} to User ${unitid}`,
                icon: "business-time",
                link: `dashboard`,
                changed: [
                  "ownLicences",
                  "companyServices",
                  "foreignLicences",
                  "semiPublicUser",
                ],
                level: 3,
              },
              ta,
              { company, level: 1 }
            ),
            createLog(
              ctx,
              "assignAccount",
              {
                licenceid,
                userid,
                rights,
                tags,
                starttime,
                endtime,
              },
              ta
            ),
          ]);

          return true;
        } catch (err) {
          if (err instanceof VIPFYPlanLimit) {
            throw err;
          }
          if (err instanceof VIPFYPlanError) {
            throw err;
          }
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  createOrbit: requiresRights(["myself", "edit-licences"]).createResolver(
    async (_p, { planid, alias, options, starttime, endtime }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company, unitid },
          } = decode(ctx.session.token);

          const { models } = ctx;

          const orbit = await models.BoughtPlan.create(
            {
              payer: company,
              usedby: company,
              disabled: false,
              alias,
              key: {
                ...options,
              },
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
              endtime,
            },
            { transaction: ta }
          );

          await createNotification(
            {
              message: starttime
                ? `User ${unitid} has created Orbit ${orbit.id} starting at ${
                    moment(starttime).toDate
                  }`
                : `User ${unitid} has created Orbit ${orbit.id}`,
              icon: "business-time",
              link: `servicemanager`,
              changed: ["companyServices"],
              level: 1,
            },
            ta,
            { company, level: 1 }
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
              orbit,
            },
            ta
          );

          return models.BoughtPlanView.findOne({
            where: { id: orbit.id },
            raw: true,
            transaction: ta,
          });
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  changeOrbit: requiresRights(["edit-licences"]).createResolver(
    async (
      _p,
      { orbitid, alias, loginurl, starttime, endtime, selfhosting },
      ctx
    ) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company, unitid },
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
            transaction: ta,
          });

          const teams = await models.DepartmentApp.findAll({
            where: {
              boughtplanid: orbitid,
              endtime: {
                [models.Op.or]: {
                  [models.Op.gt]: endtime,
                  [models.Op.eq]: Infinity,
                },
              },
            },
            transaction: ta,
          });

          const accounts = await models.LicenceData.findAll({
            where: { boughtplanid: orbitid },
            returning: true,
            transaction: ta,
            raw: true,
          });

          let users = null;
          if (accounts) {
            users = await models.LicenceRight.findAll({
              where: {
                licenceid: accounts.map(oa => oa.id),
                endtime: {
                  [models.Op.or]: {
                    [models.Op.gt]: endtime,
                    [models.Op.eq]: Infinity,
                  },
                },
              },
              returning: true,
              transaction: ta,
              raw: true,
            });
          }

          await models.BoughtPlan.update(
            {
              key: {
                ...oldorbit.key,
                domain: loginurl,
                selfhosting,
              },
              alias,
            },
            { where: { id: orbitid }, transaction: ta }
          );

          const oldperiod = await models.BoughtPlanPeriodView.findOne({
            where: { boughtplanid: orbitid },
            raw: true,
            transaction: ta,
          });

          await models.BoughtPlanPeriod.update(
            {
              starttime,
              endtime,
              creator: unitid,
            },
            { where: { boughtplanid: orbitid }, transaction: ta }
          );

          if (endtime) {
            const oldAccounts = await models.LicenceData.update(
              {
                endtime,
              },
              {
                where: { boughtplanid: oldperiod.boughtplanid },
                returning: true,
                transaction: ta,
                raw: true,
              }
            );

            const oldassignments = await models.LicenceRight.update(
              {
                endtime,
              },
              {
                where: {
                  licenceid: oldAccounts[1].map(oa => oa.id),
                  endtime: {
                    [models.Op.or]: {
                      [models.Op.gt]: endtime,
                      [models.Op.eq]: Infinity,
                    },
                  },
                },
                returning: true,
                transaction: ta,
                raw: true,
              }
            );

            await models.DepartmentApp.update(
              {
                endtime,
              },
              {
                where: {
                  boughtplanid: orbitid,
                  endtime: {
                    [models.Op.or]: {
                      [models.Op.gt]: endtime,
                      [models.Op.eq]: Infinity,
                    },
                  },
                },
                transaction: ta,
              }
            );
          }

          await createNotification(
            {
              message: endtime
                ? endtime <= moment.now()
                  ? `User ${unitid} has deleted Orbit ${orbitid}`
                  : `User ${unitid} has set Orbit ${orbitid} to expire on ${moment(
                      endtime
                    ).toDate()}`
                : `User ${unitid} has updated Orbit ${orbitid}`,
              icon: "business-time",
              link: `servicemanager`,
              changed: [
                "companyServices",
                "ownLicences",
                "foreignLicences",
                "semiPublicUser",
              ],
              level: 1,
            },
            ta,
            { company, level: 1 },
            { teams: teams.map(t => t.departmentid), level: 1 },
            { users: users.map(u => u.unitid), level: 1 }
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
                  loginurl,
                },
                alias,
                starttime,
                endtime,
              },
            },
            ta
          );

          return {
            ...oldorbit,
            key: {
              ...oldorbit.key,
              loginurl,
            },
            alias,
            starttime,
            endtime,
          };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  terminateAssignAccount: requiresRights([
    ["edit-licences", "edit-licenceRights"],
  ]).createResolver(async (_p, { assignmentid, endtime, isNull }, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      try {
        const { models, session } = ctx;
        const {
          user: { company, unitid },
        } = decode(session.token);

        const licence = await models.Licence.findOne({
          where: { assignmentid },
          raw: true,
        });

        await checkLicenceValidity(models, company, licence.id);

        let end;
        if (isNull) {
          end = "infinity";
        } else {
          end = endtime || moment.now();
        }

        await models.LicenceRight.update(
          {
            endtime: end,
          },
          {
            where: { id: assignmentid },
            transaction: ta,
          }
        );

        const assignment = await models.LicenceAssignment.findOne({
          where: { assignmentid },
          transaction: ta,
          raw: true,
        });

        await createNotification(
          {
            receiver: assignment.unitid,
            message: isNull
              ? `User ${unitid} has reactived Account ${licence.id} for User ${assignment.unitid}`
              : endtime <= moment()
              ? `User ${unitid} has deleted Account ${licence.id} for User ${assignment.unitid}`
              : `User ${unitid} has set Account ${
                  licence.id
                } to expire at ${moment(endtime).toDate()} for User ${
                  assignment.unitid
                }`,
            icon: "business-time",
            link: `dashboard`,
            changed: ["ownLicences", "foreignLicences", "semiPublicUser"],
            level: 3,
          },
          ta,
          { company, level: 1 }
        );

        await createLog(
          ctx,
          "terminateAssignAccount",
          {
            assignmentid,
            endtime,
            isNull,
          },
          ta
        );

        return assignment;
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err },
        });
      }
    })
  ),

  createVacation: requiresRights([
    ["edit-licences", "edit-licenceRights"],
  ]).createResolver(
    async (_p, { userid, starttime, endtime, assignments }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(ctx.session.token);

          const { models } = ctx;

          const vacation = await models.Vacation.create(
            {
              unitid: userid,
              starttime,
              endtime,
            },
            {
              transaction: ta,
              returning: true,
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
                  options: { vacationid: vacation.id },
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
              accountid: vacationLicences[k].licenceid,
            });
          });

          await Promise.all(notifypromises);

          await models.Vacation.update(
            { options },
            {
              where: { id: vacation.id },
              transaction: ta,
            }
          );

          await createNotification(
            {
              message: `User ${unitid} has created a vacation for User ${userid} from ${moment(
                starttime
              ).toDate()} to ${moment(endtime).toDate()}`,
              icon: "business-time",
              link: `dashboard`,
              changed: [
                "ownLicences",
                "foreignLicences",
                "semiPublicUser",
                "companyServices",
              ],
              level: 2,
            },
            ta,
            { company, level: 1 },
            null,
            {
              users: users.reduce((ua, u) => {
                if (!ua || !ua.find(e => e == u)) {
                  return ua.push(u);
                } else {
                  return ua;
                }
              }, []),
            }
          );

          await createLog(
            ctx,
            "createVacation",
            {
              userid,
              starttime,
              endtime,
              assignments,
            },
            ta
          );

          return vacation;
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  editVacation: requiresRights([
    ["edit-licences", "edit-licenceRights"],
  ]).createResolver(
    async (_p, { vacationid, starttime, endtime, assignments }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company },
          } = decode(ctx.session.token);
          const { models } = ctx;

          let vacation = await models.Vacation.update(
            { starttime, endtime },
            {
              where: { id: vacationid },
              transaction: ta,
              returning: true,
            }
          );

          const userid = vacation[1][0].dataValues.unitid;
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
                  endtime: models.sequelize.fn("NOW"),
                },
                {
                  where: {
                    id: vacation[1][0].options.find(
                      o => o.originalassignment == a.assignmentid
                    ).assignmentid,
                  },
                  transaction: ta,
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
                    options: { vacationid },
                  },
                  { transaction: ta, returning: true }
                )
              );
            }
          });

          const vacationLicences = await Promise.all(promises);
          await Promise.all(oldpromises);

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

          vacation = await models.Vacation.update(
            { options },
            {
              where: { id: vacationid },
              transaction: ta,
              returning: true,
            }
          );

          const allusers = users.concat(oldusers);

          await createNotification(
            {
              message: `User ${unitid} has updated a vacation for User ${userid} from ${moment(
                starttime
              ).toDate()} to ${moment(endtime).toDate()}`,
              icon: "business-time",
              link: `dashboard`,
              changed: [
                "ownLicences",
                "foreignLicences",
                "semiPublicUser",
                "companyServices",
              ],
              level: 2,
            },
            ta,
            { company, level: 1 },
            null,
            {
              users: allusers.reduce((ua, u) => {
                if (!ua || !ua.find(e => e == u)) {
                  return ua.push(u);
                } else {
                  return ua;
                }
              }, []),
            }
          );

          await createLog(
            ctx,
            "createVacation",
            {
              unitid,
              starttime,
              endtime,
              assignments,
            },
            ta
          );

          return vacation[1][0];
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  sendSupportRequest: requiresAuth.createResolver(async (_p, args, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      try {
        const { models, session } = ctx;

        const {
          user: { unitid, company: companyID },
        } = decode(session.token);
        const { topic, description, component, internal } = args;

        const p1 = models.User.findOne({
          where: { id: unitid },
          raw: true,
          transaction: ta,
        });

        const p2 = models.Department.findOne({
          where: { unitid: companyID },
          raw: true,
          transaction: ta,
        });

        const [user, company] = await Promise.all([p1, p2]);

        if (!company.supportid) {
          const { data } = await freshdeskAPI("POST", "companies", {
            name: `25${company.name}-${company.unitid}`,
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
            company_id: company.supportid,
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
          priority: 2,
        });

        return true;
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err },
        });
      }
    })
  ),

  saveExecutionPlan: requiresVipfyAdmin().createResolver(
    async (_p, { appid, key, script }, { models }) => {
      try {
        const jsonScript = JSON.parse(script);
        const cleanedScript = [];
        jsonScript.forEach(o => {
          let cleanedargs = {};
          switch (o.operation) {
            case "click":
              cleanedargs = { selector: o.args.selector };
              cleanedScript.push({ operation: o.operation, args: cleanedargs });
              break;
            case "waitandfill":
              cleanedargs = {
                selector: o.args.selector,
                fillkey:
                  o.args.fillkey == "email" ? "username" : o.args.fillkey,
              };
              cleanedScript.push({ operation: o.operation, args: cleanedargs });
              break;
            default:
              cleanedScript.push({ operation: o.operation, args: o.args });
            //throw new Error("Unknown script element");
          }
        });

        const res1 = await models.sequelize.query(
          `
          Update app_data set internaldata = jsonb_insert(internaldata, '{execute, -1}', :scriptblock)
          WHERE id = :appid;
        `,
          {
            replacements: {
              appid,
              scriptblock: JSON.stringify({
                key,
                script: JSON.stringify(cleanedScript),
              }),
            },
            raw: true,
          }
        );
        if (key == "Login") {
          const res2 = await models.sequelize.query(
            `
            Update app_data set options = options || :scriptblock
            WHERE id = :appid;
          `,
            {
              replacements: {
                appid,
                scriptblock: JSON.stringify({
                  execute: cleanedScript,
                }),
              },
              raw: true,
            }
          );
        }
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
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
        return app[0];
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),
  saveCookies: requiresAuth.createResolver(
    async (_p, { cookies }, { models, session }) => {
      const {
        user: { unitid },
      } = decode(session.token);
      try {
        await models.sequelize.query(
          `
          Update human_data set config = config || :cookies
          WHERE unitid = :unitid;
        `,
          {
            replacements: {
              unitid,
              cookies: JSON.stringify({ cookies }),
            },
            raw: true,
          }
        );

        return true;
      } catch (err) {
        console.log("ERROR", err);
        return false;
      }
    }
  ),

  checkEmployeeOrbit: requiresAuth.createResolver(
    async (_p, { appid }, ctx) => {
      const { models, session } = ctx;
      const {
        user: { unitid, company },
      } = decode(session.token);
      try {
        const boughtplan = await models.sequelize.query(
          `Select boughtplan_view.id from plan_data join boughtplan_view on plan_data.id = planid
          where appid = :appid
                and usedby = :company
          and key ->> 'employeeIntegrated' is not null
          and (endtime is null or endtime > now())
        `,
          {
            replacements: {
              appid,
              company,
            },
            raw: true,
          }
        );

        if (boughtplan && boughtplan[0] && boughtplan[0][0]) {
          return boughtplan[0][0].id;
        } else {
          const planRaw = await models.sequelize.query(
            `Select plan_data.id, app_data.name from plan_data join
            app_data on app_data.id = plan_data.appid
            where appid = :appid
            and plan_data.options ->> 'external' is not null
          `,
            {
              replacements: {
                appid,
              },
              raw: true,
            }
          );
          if (planRaw && planRaw[0] && planRaw[0][0]) {
            const plan = planRaw[0][0];
            const neworbit = await models.sequelize.transaction(async ta => {
              try {
                const orbit = await models.BoughtPlan.create(
                  {
                    payer: company,
                    usedby: company,
                    disabled: false,
                    alias: `${plan.name} (Integrated)`,
                    key: {
                      external: true,
                      selfIntegrated: true,
                      employeeIntegrated: true,
                    },
                  },
                  { transaction: ta }
                );

                await models.BoughtPlanPeriod.create(
                  {
                    boughtplanid: orbit.id,
                    planid: plan.id,
                    payer: company,
                    creator: unitid,
                    totalprice: 0,
                  },
                  { transaction: ta }
                );

                await createLog(
                  ctx,
                  "createOrbit",
                  {
                    plan: plan.id,
                    alias: `${plan.name} (Integrated)`,
                    options: {
                      external: true,
                      selfIntegrated: true,
                      employeeIntegrated: true,
                    },
                    orbit,
                  },
                  ta
                );
                return orbit.id;
              } catch (err) {
                console.log("ERROR", err);
                return false;
              }
            });
            return neworbit;
          }
        }
        return null;
      } catch (err) {
        console.log("ERROR", err);
        return false;
      }
    }
  ),

  searchMarketplace: async (_p, { searchTerm }, { models }) => {
    try {
      const categories = await fs
        .readFileSync(path.join(__dirname, "../../../categories.txt"))
        .toString()
        .split("\n")
        .filter(category => category.includes(searchTerm.toLowerCase()));

      const apps = await models.AppDetails.findAll({
        where: {
          name: {
            [models.Op.like]: `%${searchTerm.toLowerCase()}%`,
          },
          owner: null,
          disabled: true, // CHANGE TO FALSE, ONLY HERE FOR TESTING
        },
        LIMIT: 25,
      });

      return { categories, apps };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },
};
