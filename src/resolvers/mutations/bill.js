import moment from "moment";
import { decode } from "jsonwebtoken";
import * as Services from "@vipfy-private/services";
import {
  requiresRights,
  requiresAuth,
  requiresMachineToken,
  requiresVipfyAdmin
} from "../../helpers/permissions";
import {
  createLog,
  createNotification,
  checkPlanValidity
} from "../../helpers/functions";
import { calculatePlanPrice } from "../../helpers/apps";
import {
  createCustomer,
  listCards,
  addCard,
  addSubscriptionItem,
  updateSubscriptionItem,
  removeSubscriptionItem,
  changeDefaultCard
} from "../../services/stripe";
import { BillingError, NormalError, InvoiceError } from "../../errors";
import logger from "../../loggers";
import { getInvoiceLink } from "../../services/aws";
import createMonthlyInvoice from "../../helpers/createInvoice";

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
  addPaymentData: requiresRights(["create-paymentdata"]).createResolver(
    async (_p, { data, address, email }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, token } = ctx;
        const {
          user: { unitid, company }
        } = decode(token);

        try {
          const department = await models.Department.findOne(
            { where: { unitid: company } },
            {
              raw: true
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
                vatId: legalinformation.vatId ? legalinformation.vatId : ""
              },
              address: {
                address_city: data.card.address_city,
                address_line1: data.card.address_line1,
                address_country: data.card.address_country,
                address_zip: data.card.address_zip
              },
              source: data.id
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
                    cards: [{ ...card.data[0] }]
                  }
                }
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
                    cards: [...payingoptions.stripe.cards, { ...card }]
                  }
                }
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
              changed: ["paymentMethods"]
            },
            ta
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
                city
              }
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
              changed: ["paymentMethods"]
            },
            ta
          );

          throw new BillingError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  changeDefaultMethod: requiresRights(["edit-paymentdata"]).createResolver(
    async (parent, { card }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, token } = ctx;
        const {
          user: { company, unitid }
        } = decode(token);

        try {
          const department = await models.Unit.findById(company, {
            raw: true
          });

          const stripeId = department.payingoptions.stripe.id;
          const res = await changeDefaultCard(stripeId, card);

          const updatedDepartment = await models.Unit.update(
            {
              payingoptions: {
                stripe: {
                  ...department.payingoptions.stripe,
                  cards: res.sources.data
                }
              }
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
              changed: ["paymentMethods"]
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
              changed: ["paymentMethods"]
            },
            ta
          );
          throw new BillingError({
            message: err.message,
            internalData: { err }
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
      const { models, token } = ctx;
      const {
        user: { unitid, company }
      } = decode(token);

      let subscription = null;
      let stripeplan = null;

      try {
        await models.sequelize.transaction(async ta => {
          logger.debug("start buying process", {
            planid,
            features,
            price,
            planinputs
          });

          const plan = await models.Plan.findOne({
            where: { id: planid },
            raw: true
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
            transaction: ta
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
            internaldescription: plan.internaldescription
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
              planinputs
            },
            {
              transaction: ta
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
                    key: {}
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
              changed: ["foreignLicences", "invoices"]
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
              planinputs
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
          changed: []
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
          internalData: { err, planid, features, price, planinputs, unitid }
        });
      }
    }
  ),

  cancelPlan: requiresRights(["delete-boughtplan"]).createResolver(
    async (_p, { planid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;
          const {
            user: { company }
          } = decode(token);

          const p1 = models.BoughtPlan.findOne({
            where: { id: planid, payer: company },
            raw: true,
            transaction: ta
          });

          const p2 = models.Licence.findAll({
            where: { boughtplanid: planid },
            raw: true,
            transaction: ta
          });

          const p3 = models.Department.findOne({
            where: { unitid: company },
            raw: true,
            attributes: ["payingoptions"]
          });

          const [
            cancelledBoughtPlan,
            licences,
            { payingoptions }
          ] = await Promise.all([p1, p2, p3]);

          const { appid } = await models.Plan.findOne({
            where: { id: cancelledBoughtPlan.planid },
            raw: true,
            transaction: ta
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

          const p4 = models.BoughtPlan.update(
            {
              endtime: new Date(cancelledSubscription.current_period_end * 1000)
            },
            {
              where: { id: cancelledBoughtPlan.id, payer: company },
              transaction: ta,
              returning: true
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
              licences
            },
            ta
          );

          const promises = await Promise.all([p4, p5, p6]);
          return promises[0][1][0];
        } catch (err) {
          throw new BillingError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  updatePlan: requiresRights(["edit-boughtplan"]).createResolver(
    async (_p, { planid, features, price }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;

          const {
            user: { unitid, company }
          } = decode(token);

          const oldBoughtPlan = await models.BoughtPlan.findOne(
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
                unitid
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
            internaldescription: plan.internaldescription
          });

          const closedBoughtPlan = await models.BoughtPlan.update(
            {
              endtime: Date.now(),
              disabled: true
            },
            {
              transaction: ta,
              where: {
                payer: company,
                id: planid,
                returning: true
              }
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
              stripeplan: oldBoughtPlan.stripeplan
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
                  key: {}
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
              updatedSubscription
            },
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

  reactivatePlan: requiresRights(["edit-boughtplan"]).createResolver(
    async (_p, { planid }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;

          const {
            user: { company }
          } = decode(token);

          const p1 = models.BoughtPlan.findOne({
            where: { id: planid, payer: company },
            raw: true
          });

          const p2 = models.Department.findOne({
            where: { unitid: company },
            raw: true
          });

          const [boughtPlan, department] = await Promise.all([p1, p2]);

          const plan = await models.Plan.findOne({
            where: { id: boughtPlan.planid },
            raw: true
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
                  key: {}
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
              updatedBoughtPlan: updatedBoughtPlan[1][0]
            },
            ta
          );

          return updatedBoughtPlan[1][0];
        } catch (err) {
          throw new BillingError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  createMonthlyInvoices: requiresMachineToken.createResolver(
    async (_p, _args, { models }) => {
      try {
        const companies = await models.Department.findAll({
          where: { iscompany: true, deleted: false },
          raw: true
        });

        const promises = companies.map(company =>
          createMonthlyInvoice(company.unitid)
        );

        Promise.all(promises);

        return true;
      } catch (err) {
        throw new InvoiceError(err);
      }
    }
  ),

  createInvoice: requiresVipfyAdmin.createResolver(
    async (parent, { unitid }) => {
      try {
        await createInvoice(unitid, true);

        return true;
      } catch (err) {
        throw new InvoiceError(err);
      }
    }
  ),

  setBoughtPlanAlias: requiresRights(["edit-boughtplan"]).createResolver(
    async (parent, { alias, boughtplanid }, { models }) => {
      try {
        await models.BoughtPlan.update(
          { alias },
          { where: { id: boughtplanid } }
        );

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  addBillingEmail: requiresRights(["edit-billing"]).createResolver(
    async (_p, { email }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        try {
          const { models, token } = ctx;

          const {
            user: { company }
          } = decode(token);

          const oldEmail = await models.DepartmentEmail.findOne({
            where: { email, departmentid: company },
            raw: true
          });

          if (!oldEmail) {
            throw new Error("This email doesn't belong to this company");
          }

          let tags;
          if (oldEmail.tags) {
            tags = oldEmail.tags;
            tags.push("billing");
          } else {
            tags = ["billing"];
          }

          await models.Email.update(
            { tags },
            { where: { email }, transaction: ta, returning: true }
          );

          const p1 = createLog(ctx, "addBillingEmail", { oldEmail }, ta);

          const p2 = models.Email.findOne({ where: { email } });

          const promises = await Promise.all([p1, p2]);

          return promises[1];
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  /**
   * Removes the tag billing from an email
   *
   * @param {string} email
   *
   * @returns {object}
   */
  removeBillingEmail: requiresRights(["edit-billing"]).createResolver(
    async (_p, { email }, ctx) =>
      ctx.models.sequelize.transaction(async ta => {
        const { models, token } = ctx;
        const {
          user: { unitid, company }
        } = decode(token);

        try {
          const billingEmails = await models.DepartmentEmail.findAll({
            where: {
              tags: { [models.sequelize.Op.contains]: ["billing"] },
              departmentid: company
            },
            raw: true
          });

          if (billingEmails.length < 2) {
            throw new Error("You need at least one billing Email");
          }
          const oldEmail = billingEmails.find(bill => bill.email == email);

          if (!oldEmail) {
            throw new Error(
              "Couldn't find email in database or email is not a billing email"
            );
          }

          const tags = oldEmail.tags.filter(tag => tag != "billing");

          const removedEmail = await models.Email.update(
            { tags },
            {
              where: { email },
              returning: true,
              transaction: ta
            }
          );

          const p3 = createLog(ctx, "createEmail", { removedEmail }, ta);

          const p4 = createNotification(
            {
              receiver: unitid,
              message: "Removed Billing Email",
              icon: "envelope",
              link: "billing",
              changed: ["billingEmails"]
            },
            ta
          );

          await Promise.all([p3, p4]);

          return { ok: true };
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Removing of Billing Email failed",
              icon: "bug",
              link: "billing",
              changed: ["billingEmails"]
            },
            null
          );

          throw new BillingError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  downloadBill: requiresAuth.createResolver(
    async (parent, { billid }, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const { billname } = await models.Bill.findOne({
          where: { id: billid, unitid: company },
          raw: true
        });

        const time = moment();

        const invoiceLink = await getInvoiceLink(billname, time);
        return invoiceLink;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
