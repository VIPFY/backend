import moment from "moment";
import { decode } from "jsonwebtoken";
import * as Services from "@vipfy-private/services";
import stripePackage from "stripe";
import { requiresRights, requiresAuth } from "../../helpers/permissions";
import {
  createLog,
  createNotification,
  checkPlanValidity,
  checkVat,
} from "../../helpers/functions";
import { calculatePlanPrice } from "../../helpers/apps";
import {
  createCustomer,
  listCards,
  addCard,
  removeCard,
  addSubscriptionItem,
  updateSubscriptionItem,
  removeSubscriptionItem,
  changeDefaultCard,
} from "../../services/stripe";
import { BillingError, NormalError, InvoiceError } from "../../errors";
import logger from "../../loggers";
import { getInvoiceLink } from "../../services/aws";
import createMonthlyInvoice from "../../helpers/createInvoice";

const stripe = stripePackage(process.env.STRIPE_SECRET_KEY);

/* eslint-disable array-callback-return, no-return-await, prefer-destructuring */

export default {
  /**
   * Add a credit card to a department. We will only save a token representation
   * from stripe. Creates a new User if none exists.
   *
   * @param {any} data Data Object received from the stripe plugin.
   * @param {number} departmentid Identifier for the department the card is for.
   * @returns any
   */
  addPaymentData: requiresRights(["create-payment-data"]).createResolver(
    async (_p, { data, address, email }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;
        const {
          user: { unitid, company },
        } = decode(session.token);

        try {
          const department = await models.Department.findOne(
            { where: { unitid: company } },
            {
              raw: true,
            }
          );
          const logArgs = { department };
          const { payingoptions, legalinformation } = department;

          if (!payingoptions || !payingoptions.stripe) {
            const stripeCustomer = await createCustomer({
              customer: {
                name: data.card.name,
                email,
                ip: data.client_ip,
                vatID: legalinformation.vatID || "",
              },
              address: {
                address_city: data.card.address_city,
                address_line1: data.card.address_line1,
                address_country: data.card.address_country,
                address_zip: data.card.address_zip,
              },
              source: data.id,
            });
            const card = await listCards(stripeCustomer.id);

            await models.Unit.update(
              {
                payingoptions: {
                  ...payingoptions,
                  stripe: {
                    id: stripeCustomer.id,
                    created: stripeCustomer.created,
                    currency: stripeCustomer.currency,
                    billingEmail: email,
                    cards: [{ ...card.data[0] }],
                  },
                },
              },
              { where: { id: company } }
            );

            logArgs.stripeCustomer = stripeCustomer;
            logArgs.card = card;
          } else {
            const card = await addCard(payingoptions.stripe.id, data.id);

            await models.Unit.update(
              {
                payingoptions: {
                  ...payingoptions,
                  stripe: {
                    ...payingoptions.stripe,
                    cards: [...payingoptions.stripe.cards, { ...card }],
                  },
                },
              },
              { where: { id: company } }
            );
            logArgs.newCard = card;
          }

          const p1 = createLog(ctx, "addPaymentData", logArgs, ta);
          const p2 = createNotification(
            {
              receiver: unitid,
              message: "Credit Card successfully added",
              icon: "credit-card",
              link: "billing",
              changed: ["paymentMethods"],
            },
            ta,
            { company, message: `User ${unitid} added a new credit card` }
          );

          let p3 = new Promise(resolve => resolve(true));
          if (address) {
            const { street, zip, city } = address;
            p3 = models.Address.create({
              ...address,
              tags: ["billing"],
              unitid: company,
              address: {
                street,
                zip,
                city,
              },
            });
          }

          await Promise.all([p1, p2, p3]);

          return { ok: true };
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Adding Credit Card failed",
              icon: "credit-card",
              link: "billing",
              changed: ["paymentMethods"],
            },
            ta
          );

          throw new BillingError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  saveVatStatus: requiresRights(["create-payment-data"]).createResolver(
    async (_p, { country, vat }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;
        const {
          user: { company },
        } = decode(session.token);

        try {
          const departmentPromo = await models.Unit.findOne({
            where: { id: company },
            transaction: ta,
          });
          if (!vat.valid || !checkVat(`${country}${vat.vatNumber}`)) {
            await models.DepartmentData.update(
              {
                legalinformation: {
                  ...departmentPromo.legalinformation,
                  vatstatus: null,
                },
              },
              { where: { unitid: company }, transaction: ta }
            );
          } else {
            await models.DepartmentData.update(
              {
                legalinformation: {
                  ...departmentPromo.legalinformation,
                  vatstatus: {
                    valid: vat.valid,
                    vatNumber: vat.vatNumber,
                    selfCheck: vat.selfCheck,
                  },
                },
              },
              { where: { unitid: company }, transaction: ta }
            );
          }
          await createLog(
            ctx,
            "saveVatStatus",
            {
              country,
              vat,
              company,
            },
            ta
          );
          return true;
        } catch (err) {
          console.error(err);
          throw Error("Saving vat status didn't work");
        }
      })
  ),

  savePromoCode: requiresRights(["create-payment-data"]).createResolver(
    async (_p, { promoCode }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;
        const {
          user: { company },
        } = decode(session.token);

        try {
          await models.DepartmentData.update(
            { promocode: promoCode },
            { where: { unitid: company }, transaction: ta }
          );
          await createLog(
            ctx,
            "savePromoCode",
            {
              promoCode,
              company,
            },
            ta
          );
          return true;
        } catch (err) {
          console.error(err);
          throw Error("Saving PromoCode didn't work");
        }
      })
  ),

  saveBillingEmails: requiresRights(["create-payment-data"]).createResolver(
    async (_p, { emaildelete, emailadd }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;
        const {
          user: { company },
        } = decode(session.token);

        // Check if at least one is left over

        if (
          emaildelete.filter(ed => ed != "").length >
          emailadd.filter(ed => ed != "").length
        ) {
          const emails = await models.DepartmentEmail.findAll({
            where: {
              departmentid: company,
              tags: { [models.Op.contains]: ["billing"] },
              autogenerated: false,
            },
            order: [["priority", "DESC"]],
            raw: true,
          });

          if (emails.length - emaildelete.length + emailadd.length <= 0) {
            throw Error("You need at least one billing email");
          }
        }
        try {
          const createEmailFunction = async (resolve, reject, e) => {
            try {
              const oldEmail = await models.DepartmentEmail.findOne({
                where: {
                  departmentid: company,
                  email: e,
                  [models.Op.not]: {
                    tags: {
                      [models.Op.contains]: ["billing"],
                    },
                  },
                },
                transaction: ta,
              });
              if (oldEmail) {
                await models.Email.update(
                  {
                    tags: [...(oldEmail.dataValues.tags || []), "billing"],
                  },
                  {
                    where: {
                      email: e,
                    },
                    transaction: ta,
                  }
                );
              } else {
                await models.Email.create(
                  {
                    unitid: company,
                    email: e,
                    tags: ["billing"],
                  },
                  { transaction: ta }
                );
              }
              return resolve();
            } catch (err) {
              return reject(err);
            }
          };
          const emailaddPromises = [];
          emailadd.forEach(e => {
            if (e && e != "") {
              emailaddPromises.push(
                new Promise((resolve, reject) => {
                  createEmailFunction(resolve, reject, e);
                })
              );
            }
          });
          await Promise.all(emailaddPromises);

          // Delete old ones

          const deleteEmailFunction = async (resolve, reject, e) => {
            try {
              const deleteEmail = await models.Email.destroy({
                where: {
                  email: e,
                  unitid: company,
                },
                transaction: ta,
              });
              if (deleteEmail == 0) {
                const oldEmail = await models.DepartmentEmail.findOne({
                  where: {
                    departmentid: company,
                    email: e,
                  },
                  transaction: ta,
                });
                if (oldEmail) {
                  await models.Email.update(
                    {
                      tags: oldEmail.dataValues.tags.filter(
                        t => t != "billing"
                      ),
                    },
                    {
                      where: {
                        email: e,
                      },
                      transaction: ta,
                    }
                  );
                } else {
                  throw new Error("Email doesn't belog to this company");
                }
              }
              return resolve();
            } catch (err) {
              return reject(err);
            }
          };

          const emaildeletePromises = [];
          emaildelete.forEach(e => {
            if (e && e != "") {
              emaildeletePromises.push(
                new Promise((resolve, reject) => {
                  deleteEmailFunction(resolve, reject, e);
                })
              );
            }
          });
          await Promise.all(emaildeletePromises);

          await createLog(
            ctx,
            "saveBillingEmails",
            {
              emaildelete,
              emailadd,
              company,
            },
            ta
          );
          return true;
        } catch (err) {
          console.error(err);
          throw Error("Updating Billingemails didn't work");
        }
      })
  ),

  changeDefaultMethod: requiresRights(["edit-payment-data"]).createResolver(
    async (_p, { card }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;
        const {
          user: { company, unitid },
        } = decode(session.token);

        try {
          const department = await models.Unit.findByPk(company, {
            raw: true,
          });

          const stripeId = department.payingoptions.stripe.id;
          const res = await changeDefaultCard(stripeId, card);

          const updatedDepartment = await models.Unit.update(
            {
              payingoptions: {
                stripe: {
                  ...department.payingoptions.stripe,
                  cards: res.sources.data,
                },
              },
            },
            { where: { id: company }, returning: true }
          );

          const p1 = createLog(
            ctx,
            "changeDefaultMethod",
            { department, updatedDepartment },
            ta
          );

          const p2 = createNotification(
            {
              receiver: unitid,
              message: "New default Credit Card",
              icon: "credit-card",
              link: "billing",
              changed: ["paymentMethods"],
            },
            ta
          );

          await Promise.all([p1, p2]);

          return { ok: true };
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Switching of default Card failed",
              icon: "credit-card",
              link: "billing",
              changed: ["paymentMethods"],
            },
            ta
          );
          throw new BillingError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  removePaymentData: requiresRights(["edit-payment-data"]).createResolver(
    async (_p, { card }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;
        const {
          user: { company, unitid },
        } = decode(session.token);

        try {
          const department = await models.Unit.findByPk(company, {
            raw: true,
          });

          if (department.payingoptions.stripe.cards.length <= 1) {
            throw new Error("You can't remove your last credit card");
          }

          await removeCard(department.payingoptions.stripe.id, card);

          const cards = department.payingoptions.stripe.cards.filter(
            creditCard => creditCard.id != card
          );

          const updatedDepartment = await models.Unit.update(
            {
              payingoptions: {
                stripe: { ...department.payingoptions.stripe, cards },
              },
            },
            { where: { id: company }, returning: true }
          );

          const p1 = createLog(
            ctx,
            "removePaymentData",
            { department, updatedDepartment, card },
            ta
          );

          const p2 = createNotification(
            {
              receiver: unitid,
              message: "Removed Credit Card",
              icon: "credit-card",
              link: "billing",
              changed: ["paymentMethods"],
            },
            ta
          );

          await Promise.all([p1, p2]);

          return true;
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Removing of Credit Card failed",
              icon: "credit-card",
              link: "billing",
              changed: ["paymentMethods"],
            },
            ta
          );

          throw new BillingError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  /**
   * Buys a plan. The customer needs a valid credit card for this.
   *
   * @param {number} planid
   * @param {any} features
   * @param {number} price
   * @param {any} planinputs
   *
   * @return {any} ok
   */
  buyPlan: requiresRights(["create-boughtplan"]).createResolver(
    async (_p, { planid, features, price, planinputs }, ctx) => {
      const { models, session } = ctx;
      const {
        user: { unitid, company },
      } = decode(session.token);

      let subscription = null;
      let stripeplan = null;

      try {
        await models.sequelize.transaction(async ta => {
          logger.debug("start buying process", {
            planid,
            features,
            price,
            planinputs,
          });

          const plan = await models.Plan.findOne({
            where: { id: planid },
            raw: true,
          });

          if (!plan) {
            throw new Error("Couldn't find the Plan!");
          }

          await checkPlanValidity(plan);

          /*subscription = await checkPaymentData(
            company,
            plan.stripedata.id,
            ta
          );*/

          const department = await models.Department.findOne({
            where: { unitid: company },
            raw: true,
            transaction: ta,
          });

          const calculatedPrice = calculatePlanPrice(
            plan.price,
            plan.features,
            JSON.parse(JSON.stringify(features)) // hacky deep copy
          );

          logger.debug(
            `calulated price: ${calculatedPrice}, supplied price: ${price}`
          );

          if (price != calculatedPrice) {
            logger.error(
              `calculated Price of ${calculatedPrice} does not match requested price of ${price} for plan ${planid}`,
              { planid, features, price, planinputs, unitid }
            );
            throw new Error(
              `calculated Price of ${calculatedPrice} does not match requested price of ${price} for plan ${planid}`
            );
          }

          // compute complete features of the plan by merging default features and bought features
          const mergedFeatures = plan.internaldescription;
          // eslint-disable-next-line no-restricted-syntax
          for (const fkey of Object.keys(features)) {
            mergedFeatures[fkey] = features[fkey].value;
          }

          logger.debug("mergedFeatures", {
            mergedFeatures,
            features,
            internaldescription: plan.internaldescription,
          });

          const partnerLogs = {};

          const createBoughtPlan = await models.BoughtPlan.create(
            {
              buyer: unitid,
              payer: company,
              usedby: company,
              planid: plan.id,
              disabled: false,
              totalprice: calculatedPrice,
              additionalfeatures: features,
              totalfeatures: mergedFeatures,
              planinputs,
            },
            {
              transaction: ta,
            }
          );

          const boughtPlan = createBoughtPlan.get();

          logger.debug("createdBoughtPlan", { boughtPlan });

          const createLicences = [];

          const numLicences = mergedFeatures.users || 0;

          if (numLicences > 0) {
            for (let i = 0; i < numLicences; i++) {
              createLicences.push(
                models.LicenceData.create(
                  {
                    unitid: null,
                    boughtplanid: boughtPlan.id,
                    agreed: false,
                    disabled: false,
                    key: {},
                  },
                  { transaction: ta }
                )
              );
            }

            const newLicences = await Promise.all(createLicences);
            partnerLogs.licences = newLicences;
            logger.debug(`created ${mergedFeatures.users} licences`);
          }

          /* if (!subscription) {
            subscription = await addSubscriptionItem(
              department.payingoptions.stripe.subscription,
              plan.stripedata.id
            );

            stripeplan = subscription.id;
          } else {
            stripeplan = subscription.items.data[0].id;
          } */

          // await sleep(500);

          /* console.log(
            "CREATEACCOUNT START",
            plan,
            planinputs,
            mergedFeatures,
            boughtPlan.id
          );

          console.log("CREATE ACCOUNT");
          const { dns } = await Services.createAccount(
            models,
            plan.appid,
            planinputs,
            mergedFeatures,
            boughtPlan.id,
            ta
          ); */

          // if (dns && dns.length > 0) {
          //   throw new Error("setting dns settings not implemented yet");
          // }
          logger.debug("created Service Account");

          // let vatPercentage = null;

          // if (!department.legalinformation.noVatRequired) {
          //   vatPercentage = department.legalinformation.vatPercentage;
          // }

          /* await models.BoughtPlan.update(
            { stripeplan },
            { where: { id: boughtPlan.id }, transaction: ta }
          ); */

          const notification = createNotification(
            {
              receiver: unitid,
              message: `Successfull bought ${plan.name}`,
              icon: "shopping-cart",
              link: "team",
              changed: ["foreignLicences", "invoices"],
            },
            ta
          );

          const log = createLog(
            ctx,
            "buyPlan",
            {
              ...partnerLogs,
              department,
              boughtPlan,
              mergedFeatures,
              planid,
              features,
              price,
              planinputs,
            },
            ta
          );
          await Promise.all([log, notification]);

          logger.debug("created log");
        });
        return { ok: true };
      } catch (err) {
        await createNotification({
          receiver: unitid,
          message: "Buying plan failed",
          icon: "bug",
          link: "marketplace",
          changed: [],
        });

        /* if (subscription && stripeplan) {
          const kind = stripeplan.split("_");
          if (kind[0] == "sub") {
            await abortSubscription(stripeplan);
          } else {
            await cancelPurchase(stripeplan, subscription.id);
          }
        } */

        logger.error(err);

        throw new BillingError({
          message: err.message,
          internalData: { err, planid, features, price, planinputs, unitid },
        });
      }
    }
  ),

  cancelPlan: requiresRights(["delete-boughtplan"]).createResolver(
    async (_p, { planid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;
          const {
            user: { company },
          } = decode(session.token);

          const p1 = models.BoughtPlanView.findOne({
            where: { id: planid, payer: company },
            raw: true,
            transaction: ta,
          });

          const p2 = models.Licence.findAll({
            where: { boughtplanid: planid },
            raw: true,
            transaction: ta,
          });

          const p3 = models.Department.findOne({
            where: { unitid: company },
            raw: true,
            attributes: ["payingoptions"],
          });

          const [
            cancelledBoughtPlan,
            licences,
            { payingoptions },
          ] = await Promise.all([p1, p2, p3]);

          const { appid } = await models.Plan.findOne({
            where: { id: cancelledBoughtPlan.planid },
            raw: true,
            transaction: ta,
          });

          const assignedLicences = licences.filter(
            licence => licence.unitid != null
          );

          if (assignedLicences.length > 0) {
            throw new Error("There are still licences assigned for this plan");
          }

          await Services.cancelAccount(
            models,
            appid,
            cancelledBoughtPlan.id,
            ta
          );

          const cancelledSubscription = await removeSubscriptionItem(
            cancelledBoughtPlan.stripeplan,
            payingoptions.stripe.subscription
          );

          //TODO: fix it with new BoughtPlanPeriods!!

          const p4 = models.BoughtPlan.update(
            {
              endtime: new Date(
                cancelledSubscription.current_period_end * 1000
              ),
            },
            {
              where: { id: cancelledBoughtPlan.id, payer: company },
              transaction: ta,
              returning: true,
            }
          );

          const p5 = models.LicenceData.update(
            { endtime: cancelledBoughtPlan.endtime },
            { where: { id: cancelledBoughtPlan.id }, transaction: ta }
          );

          const p6 = createLog(
            ctx,
            "cancelPlan",
            {
              cancelledBoughtPlan,
              cancelledSubscription,
              licences,
            },
            ta
          );

          const promises = await Promise.all([p4, p5, p6]);
          return promises[0][1][0];
        } catch (err) {
          throw new BillingError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  updatePlan: requiresRights(["edit-boughtplan"]).createResolver(
    async (_p, { planid, features, price }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { unitid, company },
          } = decode(session.token);

          const oldBoughtPlan = await models.BoughtPlanView.findOne(
            { where: { id: planid, payer: company } },
            { raw: true, transaction: ta }
          );

          if (!oldBoughtPlan) {
            throw new Error("Couldn't find Plan!");
          }

          const plan = await models.Plan.findOne(
            { where: { id: oldBoughtPlan.planid } },
            { raw: true, transaction: ta }
          );

          await checkPlanValidity(plan);

          const calculatedPrice = calculatePlanPrice(
            plan.price,
            plan.features,
            JSON.parse(JSON.stringify(features)) // hacky deep copy
          );

          logger.debug(
            `calulated price: ${calculatedPrice}, supplied price: ${price}`
          );

          if (price != calculatedPrice) {
            logger.error(
              `calculated Price of ${calculatedPrice} does not match requested price of ${price} for plan ${planid}`,
              {
                planid,
                features,
                price,
                planinputs: oldBoughtPlan.planinputs,
                unitid,
              }
            );
            throw new Error(
              `Calculated Price of ${calculatedPrice} does not match requested price of ${price} for plan ${planid}`
            );
          }

          const mergedFeatures = plan.internaldescription;
          // eslint-disable-next-line no-restricted-syntax

          for (const fkey of Object.keys(features)) {
            mergedFeatures[fkey] = features[fkey].value;
          }

          logger.debug("mergedFeatures", {
            mergedFeatures,
            features,
            internaldescription: plan.internaldescription,
          });
          //TODO: fix it with new BoughtPlanPeriods!!
          const closedBoughtPlan = await models.BoughtPlan.update(
            {
              endtime: Date.now(),
              disabled: true,
            },
            {
              transaction: ta,
              where: {
                payer: company,
                id: planid,
                returning: true,
              },
            }
          );

          let newBoughtPlan = await models.BoughtPlan.create(
            {
              buyer: unitid,
              payer: company,
              usedby: company,
              predecessor: oldBoughtPlan.id,
              planid: plan.id,
              disabled: false,
              totalprice: calculatedPrice,
              additionalfeatures: features,
              totalfeatures: mergedFeatures,
              planinputs: oldBoughtPlan.planinputs,
              stripeplan: oldBoughtPlan.stripeplan,
            },
            { transaction: ta }
          );
          newBoughtPlan = newBoughtPlan.get();

          const createLicences = [];

          for (let i = 0; i < mergedFeatures.users; i++) {
            createLicences.push(
              models.LicenceData.create(
                {
                  unitid: null,
                  boughtplanid: newBoughtPlan.id,
                  agreed: false,
                  disabled: false,
                  key: {},
                },
                { transaction: ta }
              )
            );
          }

          const newLicences = await Promise.all(createLicences);

          await Services.changePlan(
            models,
            plan.appid,
            oldBoughtPlan.id,
            newBoughtPlan.id,
            plan.id,
            ta
          );

          const updatedSubscription = updateSubscriptionItem(
            oldBoughtPlan.stripeplan,
            plan.stripedata.id
          );

          await createLog(
            ctx,
            "updatePlan",
            {
              oldBoughtPlan,
              closedBoughtPlan: closedBoughtPlan[1][0],
              newBoughtPlan,
              newLicences,
              updatedSubscription,
            },
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

  reactivatePlan: requiresRights(["edit-boughtplan"]).createResolver(
    async (_p, { planid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, session } = ctx;

          const {
            user: { company },
          } = decode(session.token);

          const p1 = models.BoughtPlanView.findOne({
            where: { id: planid, payer: company },
            raw: true,
          });

          const p2 = models.Department.findOne({
            where: { unitid: company },
            raw: true,
          });

          const [boughtPlan, department] = await Promise.all([p1, p2]);

          const plan = await models.Plan.findOne({
            where: { id: boughtPlan.planid },
            raw: true,
          });

          await checkPlanValidity(plan);
          const createLicences = [];

          for (let i = 0; i < boughtPlan.totalfeatures.users; i++) {
            createLicences.push(
              models.LicenceData.create(
                {
                  unitid: null,
                  boughtplanid: boughtPlan.id,
                  agreed: false,
                  disabled: false,
                  key: {},
                },
                { transaction: ta }
              )
            );
          }

          await Services.createAccount(
            models,
            plan.appid,
            boughtPlan.planinputs,
            boughtPlan.totalfeatures,
            boughtPlan.id,
            ta
          );

          const reactivatedSubscription = await addSubscriptionItem(
            department.payingoptions.stripe.subscription,
            plan.stripedata.id
          );
          //TODO: fix it with new BoughtPlanPeriods!!
          const updatedBoughtPlan = await models.BoughtPlan.update(
            { endtime: null },
            { where: { id: boughtPlan.id }, transaction: ta, returning: true }
          );

          const newLicences = await Promise.all(createLicences);

          await createLog(
            ctx,
            "reactivatePlan",
            {
              newLicences,
              reactivatedSubscription,
              updatedBoughtPlan: updatedBoughtPlan[1][0],
            },
            ta
          );

          return updatedBoughtPlan[1][0];
        } catch (err) {
          throw new BillingError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  // createMonthlyInvoices: requiresMachineToken.createResolver(
  //   async (_p, _args, { models }) => {
  //     try {
  //       const companies = await models.Department.findAll({
  //         where: { iscompany: true, deleted: false },
  //         raw: true
  //       });

  //       const promises = companies.map(company =>
  //         createMonthlyInvoice(company.unitid)
  //       );

  //       Promise.all(promises);

  //       return true;
  //     } catch (err) {
  //       throw new InvoiceError(err);
  //     }
  //   }
  // ),

  createMonthlyInvoices: async (_p, _args, { models }) => {
    try {
      await createMonthlyInvoice(2433);

      return true;
    } catch (err) {
      throw new InvoiceError(err);
    }
  },

  /**
   * Creates a download link for an invoice
   *
   * @param {string} billid
   *
   * @returns {string} - Downloadlink for the invoices storage location
   */
  downloadBill: requiresAuth.createResolver(
    async (_parent, { billid }, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);

        const { billname } = await models.Bill.findOne({
          where: { id: billid, unitid: company },
          raw: true,
        });

        return getInvoiceLink(billname, moment());
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  createNewBillingEmail: requiresRights(["create-email"]).createResolver(
    async (_p, { email }, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);

        await models.Email.create({
          unitid: company,
          email,
          tags: ["billing"],
        });

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  startRecurringBillingIntent: requiresRights([
    "create-payment-data",
  ]).createResolver(async (_p, args, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      const { models, session } = ctx;
      try {
        const {
          user: { company },
        } = decode(session.token);

        let stripeId = null;

        const department = await models.Department.findOne({
          where: { unitid: company },
          transaction: ta,
          raw: true,
        });
        const { payingoptions, legalinformation } = department;

        if (
          (!payingoptions.stripe || !payingoptions.stripe.id) &&
          legalinformation.vatstatus
        ) {
          const addressStripe = await models.Address.findOne({
            where: { unitid: company },
            attributes: ["country", "address"],
            raw: true,
            transaction: ta,
          });

          const emailStripe = await models.DepartmentEmail.findOne({
            where: {
              departmentid: company,
              tags: { [models.Op.contains]: ["billing"] },
              autogenerated: false,
            },
            order: [["priority", "DESC"]],
            raw: true,
            transaction: ta,
          });

          const phoneStripe = await models.Phone.findOne({
            where: {
              unitid: company,
              tags: { [models.Op.contains]: ["billing"] },
            },
            order: [["priority", "DESC"]],
            raw: true,
            transaction: ta,
          });
          const stripeCustomer = await stripe.customers.create({
            name: department.name,
            email: emailStripe.email,
            phone: phoneStripe.number,
            tax_exempt: legalinformation.vatstatus.vatNumber
              ? "reverse"
              : "exempt",
            tax_id_data: legalinformation.vatstatus.vatNumber && [
              {
                type: "eu_vat",
                value: `${addressStripe.country}${legalinformation.vatstatus.vatNumber}`,
              },
            ],
            address: {
              city: addressStripe.address.city,
              line1: addressStripe.address.street,
              line2: addressStripe.address.addition,
              country: addressStripe.country,
              postal_code: addressStripe.address.postalCode,
            },
          });

          await models.Unit.update(
            {
              payingoptions: {
                ...department.payingoptions,
                stripe: {
                  id: stripeCustomer.id,
                },
              },
            },
            { where: { id: company }, transaction: ta }
          );
          stripeId = stripeCustomer.id;
        } else {
          stripeId = payingoptions.stripe.id;
        }

        const intent = await stripe.setupIntents.create({
          customer: stripeId,
        });

        await createLog(
          ctx,
          "startRecurringBillingIntent",
          {
            company,
          },
          ta
        );

        return { secret: intent.client_secret, setupid: intent.id };
      } catch (err) {
        throw new BillingError({
          message: err.message,
          internalData: { err },
        });
      }
    })
  ),

  cancelRecurringBillingIntent: requiresRights([
    "create-payment-data",
  ]).createResolver(async (_p, { setupid }, ctx) =>
    ctx.models.sequelize.transaction(async () => {
      try {
        await stripe.setupIntents.cancel(setupid);
        await createLog(ctx, "cancelRecurringBillingIntent", {
          setupid,
        });
        return true;
      } catch (err) {
        throw new BillingError({
          message: err.message,
          internalData: { err },
        });
      }
    })
  ),

  deletePaymentMethod: requiresRights(["create-payment-data"]).createResolver(
    async (_p, { paymentMethodId }, ctx) =>
      ctx.models.sequelize.transaction(async () => {
        const { models, session } = ctx;
        try {
          const {
            user: { company },
          } = decode(session.token);

          await stripe.paymentMethods.detach(paymentMethodId);

          const paymentData = await models.Unit.findOne({
            where: { id: company },
            attributes: ["payingoptions"],
            raw: true,
          });

          await models.Unit.update(
            {
              payingoptions: {
                ...paymentData.payingoptions,
                stripe: {
                  ...paymentData.payingoptions.stripe,
                  cards: [
                    paymentData.payingoptions.stripe.cards.filter(
                      c => c != paymentMethodId
                    ),
                  ],
                },
              },
            },
            { where: { id: company } }
          );
          await createLog(ctx, "deletePaymentMethod", {
            paymentMethodId,
            company,
          });
          return true;
        } catch (err) {
          throw new BillingError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  addCard: requiresRights(["create-payment-data"]).createResolver(
    async (_p, { paymentMethodId }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, session } = ctx;
        try {
          const {
            user: { company },
          } = decode(session.token);

          let stripeId = null;

          const department = await models.Department.findOne({
            where: { unitid: company },
            transaction: ta,
            raw: true,
          });
          const { payingoptions } = department;

          await models.Unit.update(
            {
              payingoptions: {
                ...payingoptions,
                stripe: {
                  ...payingoptions.stripe,
                  cards: [paymentMethodId, ...payingoptions.stripe.cards],
                },
              },
            },
            { where: { id: company } }
          );

          await createLog(
            ctx,
            "addCard",
            {
              paymentMethodId,
              company,
            },
            ta
          );
          return true;
        } catch (err) {
          throw new BillingError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  changeCardOrder: requiresRights(["create-payment-data"]).createResolver(
    async (_p, { paymentMethodId, index }, ctx) =>
      ctx.models.sequelize.transaction(async () => {
        const { models, session } = ctx;
        try {
          const {
            user: { company },
          } = decode(session.token);

          const paymentData = await models.Unit.findOne({
            where: { id: company },
            attributes: ["payingoptions"],
            raw: true,
          });

          const updatedOrdercards = paymentData.payingoptions.stripe.cards.filter(
            sc => sc != paymentMethodId
          );

          updatedOrdercards.splice(index, 0, paymentMethodId);

          let stripeCards = await listCards(
            paymentData.payingoptions.stripe.id
          );

          const sortedcards = [];
          updatedOrdercards.forEach(c => {
            const stripecard = stripeCards.find(sc => c == sc.id);
            if (stripecard) {
              sortedcards.push(stripecard);
              stripeCards = stripeCards.filter(sc => c != sc.id);
            }
          });

          const cards = [...sortedcards, ...stripeCards];

          await models.Unit.update(
            {
              payingoptions: {
                ...paymentData.payingoptions,
                stripe: {
                  ...paymentData.payingoptions.stripe,
                  cards: updatedOrdercards,
                },
              },
            },
            { where: { id: company } }
          );
          await createLog(ctx, "addCard", {
            paymentMethodId,
            index,
            company,
          });
          return {
            stripeid: paymentData.payingoptions.stripe.id,
            cards,
          };
        } catch (err) {
          throw new BillingError({
            message: err.message,
            internalData: { err },
          });
        }
      })
  ),

  // Experimental Function
  chargeCard: requiresRights(["create-payment-data"]).createResolver(
    async (_p, { customerid }, ctx) =>
      ctx.models.sequelize.transaction(async () => {
        const {
          user: { unitid },
        } = decode(ctx.session.token);
        try {
          const paymentMethods = await stripe.paymentMethods.list({
            customer: customerid,
            type: "card",
          });
          console.log("paymentMethods", paymentMethods);

          const paymentIntent = await stripe.paymentIntents.create({
            amount: 1099,
            currency: "usd",
            customer: customerid,
            payment_method: paymentMethods.data[0].id,
            off_session: true,
            confirm: true,
          });

          console.log("paymentIntent", paymentIntent);
          return true;
        } catch (err) {
          console.log(err);
          console.log("Error code is: ", err.code);
          const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(
            err.raw.payment_intent.id
          );
          console.log("PI retrieved: ", paymentIntentRetrieved);

          await createNotification(
            {
              receiver: unitid,
              message: "Payment failed",
              icon: "credit-card",
              link: "billing",
              options: {
                clientSecret: paymentIntentRetrieved.client_secret,
                notificationType: "BillingError",
                paymentMethodId:
                  paymentIntentRetrieved.last_payment_error.payment_method.id,
              },
            },
            null
          );

          /* throw new BillingError({
            message: err.message,
            internalData: { err }
          }); */
          return false;
        }
      })
  ),
};
