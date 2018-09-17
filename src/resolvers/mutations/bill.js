import { decode } from "jsonwebtoken";
import * as Services from "@vipfy-private/services";
import { requiresRights, requiresAuth } from "../../helpers/permissions";
import { createLog, createNotification } from "../../helpers/functions";
import { calculatePlanPrice } from "../../helpers/apps";

// import createInvoice from "../../helpers/createInvoice";
import { invoiceLink } from "../../services/gcloud";
import {
  createCustomer,
  listCards,
  addCard,
  createSubscription
} from "../../services/stripe";
import { BillingError } from "../../errors";
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
    async (parent, { data, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        const {
          user: { unitid }
        } = decode(token);

        try {
          const department = await models.Unit.findById(departmentid, {
            raw: true
          });
          const logArgs = { department };

          if (!department.payingoptions || !department.payingoptions.stripe) {
            const stripeCustomer = await createCustomer(
              { name: data.card.name, id: data.client_ip },
              data.id
            );
            const card = await listCards(stripeCustomer.id);

            await models.Unit.update(
              {
                payingoptions: {
                  stripe: {
                    id: stripeCustomer.id,
                    created: stripeCustomer.created,
                    currency: stripeCustomer.currency,
                    cards: [{ ...card.data[0] }]
                  }
                }
              },
              { where: { id: departmentid } }
            );

            logArgs.stripeCustomer = stripeCustomer;
            logArgs.card = card;
          } else {
            const card = await addCard(
              department.payingoptions.stripe.id,
              data.id
            );
            await models.Unit.update(
              {
                payingoptions: {
                  stripe: {
                    ...department.payingoptions.stripe,
                    cards: [
                      ...department.payingoptions.stripe.cards,
                      { ...card }
                    ]
                  }
                }
              },
              { where: { id: departmentid } }
            );
            logArgs.newCard = card;
          }

          const p1 = createLog(ip, "addPaymentData", logArgs, unitid, ta);
          const p2 = createNotification(
            {
              receiver: unitid,
              message: "Credit Card successfully added",
              icon: "cc-stripe",
              link: "billing"
            },
            ta
          );

          await Promise.all([p1, p2]);

          return { ok: true };
        } catch (err) {
          await createNotification(
            {
              receiver: unitid,
              message: "Adding Credit Card failed",
              icon: "cc-stripe",
              link: "billing"
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
          // const billItems = [];
          const key = {};

          logger.debug("start buying process", {
            planid,
            features,
            price,
            planinputs
          });

          const department = await models.Unit.findById(company, { raw: true });
          // TODO: check whether the card is valid
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

          if (plan.enddate && plan.enddate < Date.now()) {
            throw new Error(`The plan ${plan.name} has already expired!`);
          }

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

          // const stripePlans = [];
          /* billItems.push({
            description: plan.name,
            quantity: numlicences,
            unitPrice: plan.price
          });

          stripePlans.push({ plan: plan.stripedata.id }); */

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
              totalfeatures: mergedFeatures
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
                  key
                },
                { transaction: ta }
              )
            );
          }

          const newLicences = await Promise.all(createLicences);
          partnerLogs.licences = newLicences;
          logger.debug(`created ${mergedFeatures.users} licences`);

          /* await createSubscription(
            department.payingoptions.stripe.id,
            stripePlans
          ); */
          // const bill = await models.Bill.create({ unitid: company }, { transaction: ta });

          // const res = await createInvoice(false, models, company, bill.id, billItems);
          // if (res.ok !== true) {
          //   throw new Error(res.err);
          // }
          //
          // await models.Bill.update(
          //   { billname: res.billName },
          //   { where: { id: bill.id }, transaction: ta }
          // );
          //
          // const createBillPositions = boughtPlans.map(
          //   async plan =>
          //     await models.BillPosition.create(
          //       {
          //         billid: bill.id,
          //         positiontext: `Plan ${plan.planid}, Licences ${plan.amount}`,
          //         price: plan.totalprice,
          //         planid: plan.planid,
          //         currency: "USD"
          //       },
          //       { transaction: ta }
          //     )
          // );
          //
          // await Promise.all(createBillPositions);

          await createLog(
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

          logger.debug("created log");
        });
        return { ok: true };
      } catch (err) {
        logger.error(err);
        throw new BillingError({
          message: err.message,
          internalData: { err, planid, features, price, planinputs, unitid }
        });
      }
    }
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
  )
};
