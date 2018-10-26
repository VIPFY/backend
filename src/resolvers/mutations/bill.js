import { decode } from "jsonwebtoken";
import * as Services from "@vipfy-private/services";
import { requiresRights } from "../../helpers/permissions";
import {
  createLog,
  createNotification,
  checkPlanValidity
} from "../../helpers/functions";
import { calculatePlanPrice } from "../../helpers/apps";

// import createInvoice from "../../helpers/createInvoice";
import { invoiceLink } from "../../services/gcloud";
import {
  createCustomer,
  listCards,
  addCard,
  createSubscription,
  cancelSubscription,
  changeDefaultCard,
  reactivateSubscription
} from "../../services/stripe";
import { BillingError, NormalError } from "../../errors";
import logger from "../../loggers";

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
    async (parent, { data, address, email }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
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

          const p1 = createLog(ip, "addPaymentData", logArgs, unitid, ta);
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
    async (parent, { card }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
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
            ip,
            "changeDefaultMethod",
            { department, updatedDepartment },
            unitid,
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
    async (
      parent,
      { planid, features, price, planinputs },
      { models, token, ip }
    ) => {
      const {
        user: { unitid, company }
      } = decode(token);
      try {
        await models.sequelize.transaction(async ta => {
          logger.debug("start buying process", {
            planid,
            features,
            price,
            planinputs
          });

          const department = await models.Unit.findById(company, { raw: true });

          if (
            !department.payingoptions ||
            !department.payingoptions.stripe ||
            !department.payingoptions.stripe.cards ||
            department.payingoptions.stripe.cards.length < 1
          ) {
            throw new Error("Missing payment information!");
          }

          const plan = await models.Plan.findOne({
            where: { id: planid },
            attributes: [
              "price",
              "id",
              "appid",
              "name",
              "numlicences",
              "enddate",
              "stripedata",
              "features",
              "internaldescription"
            ],
            raw: true
          });

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

          const stripePlans = [];

          stripePlans.push({ plan: plan.stripedata.id });

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

          const { dns } = await Services.createAccount(
            models,
            plan.appid,
            planinputs,
            mergedFeatures,
            boughtPlan.id,
            ta
          );

          // if (dns && dns.length > 0) {
          //   throw new Error("setting dns settings not implemented yet");
          // }
          logger.debug("created Service Account");

          const createLicences = [];

          for (let i = 0; i < mergedFeatures.users; i++) {
            createLicences.push(
              models.Licence.create(
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

          const subscription = await createSubscription(
            department.payingoptions.stripe.id,
            stripePlans
          );

          await models.BoughtPlan.update(
            { stripeplan: subscription.id },
            { where: { id: boughtPlan.id }, transaction: ta }
          );

          const notification = createNotification(
            {
              receiver: unitid,
              message: "Buying plan successful",
              icon: "shopping-cart",
              link: "team",
              changed: ["foreignLicences"]
            },
            ta
          );

          const log = createLog(
            ip,
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
            unitid,
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
        logger.error(err);
        throw new BillingError({
          message: err.message,
          internalData: { err, planid, features, price, planinputs, unitid }
        });
      }
    }
  ),

  cancelPlan: requiresRights(["delete-boughtplan"]).createResolver(
    async (parent, { planid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
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

          const [cancelledBoughtPlan, licences] = await Promise.all([p1, p2]);

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

          const cancelledSubscription = await cancelSubscription(
            cancelledBoughtPlan.stripeplan
          );

          const p3 = models.BoughtPlan.update(
            {
              endtime: new Date(cancelledSubscription.current_period_end * 1000)
            },
            {
              where: { id: cancelledBoughtPlan.id, payer: company },
              transaction: ta,
              returning: true
            }
          );

          const p4 = models.Licence.destroy(
            { where: { id: cancelledBoughtPlan.id } },
            { transaction: ta }
          );

          const p5 = createLog(
            ip,
            "cancelPlan",
            {
              cancelledBoughtPlan,
              cancelledSubscription,
              licences
            },
            unitid,
            ta
          );

          const promises = await Promise.all([p3, p4, p5]);
          return promises[0][1][0];
        } catch (err) {
          throw new BillingError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  reactivatePlan: requiresRights(["edit-boughtplan"]).createResolver(
    async (parent, { planid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
          } = decode(token);

          const boughtPlan = await models.BoughtPlan.findOne({
            where: { id: planid, payer: company },
            raw: true
          });

          const plan = await models.Plan.findOne({
            where: { id: boughtPlan.planid },
            raw: true
          });

          await checkPlanValidity(plan);
          const createLicences = [];

          for (let i = 0; i < boughtPlan.totalfeatures.users; i++) {
            createLicences.push(
              models.Licence.create(
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

          const reactivatedSubscription = await reactivateSubscription(
            boughtPlan.stripeplan
          );

          const updatedBoughtPlan = await models.BoughtPlan.update(
            { endtime: null },
            { where: { id: boughtPlan.id }, transaction: ta, returning: true }
          );

          const newLicences = await Promise.all(createLicences);

          await createLog(
            ip,
            "reactivatePlan",
            {
              newLicences,
              reactivatedSubscription,
              updatedBoughtPlan: updatedBoughtPlan[1][0]
            },
            unitid,
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

  /*
  // TODO: Add logging when changed
  createMonthlyBill: async (parent, args, { models, token }) => {
    try {
      const {
        user: { company: unitid }
      } = decode(token);
      const bill = await models.Bill.create({ unitid });
      const billid = bill.get("id");
      const billItems = await models.BillPosition.findAll({
        where: { billid }
      });
      // const billItems = [
      //   {
      //     description: "Some interesting test",
      //     quantity: 5,
      //     unitPrice: 19.99
      //   },
      //   {
      //     description: "Another interesting test",
      //     quantity: 10,
      //     unitPrice: 5.99
      //   },
      //   {
      //     description: "The most interesting one",
      //     quantity: 3,
      //     unitPrice: 9.99
      //   }
      // ];
      console.log(billItems);
      // const ok = await createInvoice(true, models, unitid, billid, billItems);
      // if (ok !== true) {
      //   throw new Error(ok);
      // }

      // return { ok };
      return { ok: true };
    } catch (err) {
      throw new BillingError(err);
    }
  },
  // TODO: Add logging when changed
  addBillPos: requiresAuth.createResolver(
    async (parent, { bill, billid }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company }
          } = decode(token);
          let id = billid;

          if (!billid) {
            const invoice = await models.Bill.create(
              { unitid: company, billtime: null },
              { raw: true, transaction: ta }
            );
            id = invoice.id;
          }

          await models.BillPosition.create(
            { ...bill, billid: id, unitid: company },
            { transaction: ta, raw: true }
          );

          return { ok: true };
        } catch (err) {
          throw new BillingError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),
  */

  // TODO: Add logging when changed
  downloadBill: requiresRights(["view-paymentdata"]).createResolver(
    async (parent, { billid }, { models, token }) => {
      try {
        const {
          user: { company: unitid }
        } = await decode(token);
        const bill = await models.Bill.findOne({
          where: { unitid, id: billid },
          attributes: ["billname", "billtime"]
        });

        if (!bill) {
          throw new BillingError("Couldn't find invoice!");
        }
        const name = bill.get("billname");
        const time = bill.get("billtime");

        const downloadLink = await invoiceLink(name, time);

        return downloadLink;
      } catch (err) {
        throw new BillingError({ message: err.message, internalData: { err } });
      }
    }
  ),

  setBoughtPlanAlias: requiresRights(["edit-boughtplan"]).createResolver(
    async (parent, { alias, boughtplanid }, { models, token }) => {
      try {
        const bill = await models.BoughtPlan.update(
          {
            alias
          },
          {
            where: { id: boughtplanid }
          }
        );

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
