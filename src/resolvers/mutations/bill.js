import moment from "moment";
import { uniq } from "lodash";
import { decode } from "jsonwebtoken";
import * as Services from "@vipfy-private/services";
import { requiresRights, requiresAuth } from "../../helpers/permissions";
import {
  createLog,
  createNotification,
  checkPlanValidity,
  checkPaymentData,
  formatFilename,
  groupBy
} from "../../helpers/functions";
import { calculatePlanPrice } from "../../helpers/apps";
import {
  createCustomer,
  listCards,
  addCard,
  createSubscription,
  addSubscriptionItem,
  updateSubscriptionItem,
  removeSubscriptionItem,
  changeDefaultCard,
  abortSubscription,
  cancelPurchase
} from "../../services/stripe";
import { BillingError, NormalError } from "../../errors";
import logger from "../../loggers";
import createInvoice from "../../helpers/invoiceGenerator";
import { uploadInvoice, getInvoiceLink } from "../../services/aws";

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

          console.log("PLAN", plan);

          if (!plan) {
            throw new Error("Couldn't find the Plan!");
          }

          await checkPlanValidity(plan);

          /*subscription = await checkPaymentData(
            company,
            plan.stripedata.id,
            ta
          );*/

          //console.log("subscription", subscription);

          const department = await models.Department.findOne({
            where: { unitid: company },
            raw: true,
            transaction: ta
          });

          console.log("department", department);

          const calculatedPrice = calculatePlanPrice(
            plan.price,
            plan.features,
            JSON.parse(JSON.stringify(features)) // hacky deep copy
          );

          console.log("calculatedPrice", calculatedPrice);

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

          console.log("BOUGHTPLAN");
          const boughtPlan = createBoughtPlan.get();

          logger.debug("createdBoughtPlan", { boughtPlan });

          const createLicences = [];

          const numLicences = mergedFeatures.users || 0;

          console.log("BUY PLAN LICENCES", numLicences, mergedFeatures);
          if (numLicences > 0) {
            for (let i = 0; i < numLicences; i++) {
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

          console.log(
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
          );

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

          const p5 = models.Licence.update(
            { endtime: cancelledBoughtPlan.endtime },
            { where: { id: cancelledBoughtPlan.id }, transaction: ta }
          );

          const p6 = createLog(
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
    async (parent, { planid, features, price }, { ip, models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
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
              models.Licence.create(
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
            ip,
            "updatePlan",
            {
              oldBoughtPlan,
              closedBoughtPlan: closedBoughtPlan[1][0],
              newBoughtPlan,
              newLicences,
              updatedSubscription
            },
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

  reactivatePlan: requiresRights(["edit-boughtplan"]).createResolver(
    async (parent, { planid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
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

  // TODO: Add logging when changed
  createInvoice: requiresAuth.createResolver(
    async (parent, { monthly }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { company: unitid }
          } = decode(token);

          const billData = await models.sequelize.query(
            `
          SELECT bd.id,
                 bd.buytime,
                 bd.totalprice as "unitPrice",
                 bd.totalfeatures,
                 bd.alias,
                 ad.name as service,
                 pd.id as planid,
                 pd.currency,
                 json_build_object('name', bd.alias,'data', bd.totalfeatures->>'users') as description
          FROM boughtplan_data bd
            INNER JOIN plan_data pd ON bd.planid = pd.id
            INNER JOIN app_data ad ON pd.appid = ad.id
          WHERE (bd.endtime IS NULL OR bd.endtime > DATE_TRUNC('month', NOW()))
            AND bd.disabled = FALSE
            AND bd.payer = :company
            AND (pd.options ->> 'external' IS NULL OR pd.options ->> 'external' = 'FALSE')
          GROUP BY bd.id, ad.name, pd.id;
        `,
            {
              replacements: { company: unitid },
              type: models.sequelize.QueryTypes.SELECT
            }
          );

          const groupByCurrency = groupBy(
            billData,
            billPos => billPos.currency
          );

          const tags = { [models.Op.contains]: ["billing"] };

          const p1 = models.Address.findOne({
            attributes: ["country", "address"],
            where: { unitid, tags },
            raw: true
          });

          const p2 = models.DepartmentEmail.findAll({
            attributes: ["email"],
            where: { departmentid: unitid, tags },
            raw: true
          });

          const p3 = models.Phone.findOne({
            attributes: ["number"],
            where: { unitid, tags },
            raw: true
          });

          const p4 = models.Department.findOne({
            attributes: ["name", "legalinformation"],
            where: { unitid },
            raw: true
          });

          // eslint-disable-next-line
          let [address, emails, phone, company] = await Promise.all([
            p1,
            p2,
            p3,
            p4
          ]);

          if (!address) {
            // This should throw an error later
            address = {
              address: {
                street: "Not set yet",
                zip: "00000",
                city: "Not set"
              },
              country: "Not set"
            };
          }

          if (!phone) {
            phone = "+00000000000000";
          }

          const { email } = uniq(emails)[0];

          const {
            country,
            address: { zip, city, street }
          } = address;

          const date = moment().format("YYYY-MM-DD");
          const dueDate = moment()
            .add(2, "weeks")
            .format("YYYY-MM-DD");

          const year = moment().format("YYYY");

          const billObjects = Object.values(groupByCurrency);
          for await (const pos of billObjects) {
            const billItems = { positions: [], credits: [] };

            const total = pos
              .reduce((acc, cV) => acc + parseFloat(cV.unitPrice), 0)
              .toFixed(2);

            const createBill = await models.Bill.create(
              {
                unitid,
                amount: total,
                currency: pos[0].currency
              },
              { transaction: ta }
            );

            const bill = createBill.get();

            const groupData = groupBy(pos, billPos => billPos.service);
            for await (const group of Object.values(groupData)) {
              const billPos = {
                service: group[0].service,
                currency: group[0].currency,
                description: [],
                boughtPlanIds: []
              };

              let unitPrice = 0.0;
              for (const position of group) {
                billPos.description.push(position.description);
                billPos.boughtPlanIds.push(position.id);
                unitPrice += parseFloat(position.unitPrice);
              }

              billPos.unitPrice = unitPrice.toFixed(2);
              billItems.positions.push(billPos);
              const createBillPos = await models.BillPosition.create(
                {
                  billid: bill.id,
                  price: billPos.unitPrice,
                  positiondata: billPos.description,
                  currency: billPos.currency,
                  boughtPlanIds: billPos.boughtPlanIds
                },
                { transaction: ta }
              );

              const billPosData = createBillPos.get();
              billPos.id = billPosData.id;
            }

            let totalCredits = 0;

            for await (const position of billItems.positions) {
              if (position.unitPrice == 0) {
                continue;
              }

              position.discountedPrice = parseFloat(position.unitPrice);

              const credits = await models.sequelize.query(
                `
              SELECT cuhv.*, array_agg(DISTINCT bpd.id) as spendablefor
              FROM creditsuserhas_view cuhv
                LEFT JOIN creditsspendableforplan_data csfpd ON cuhv.creditid = csfpd.creditid
                RIGHT JOIN boughtplan_data bpd ON csfpd.planid = bpd.planid
              WHERE cuhv.unitid = :company
                AND bpd.payer = :company
              GROUP BY cuhv.amountremaining, cuhv.currency, cuhv.source, cuhv.unitid, cuhv.id, cuhv.expiresat, cuhv.createdat,
                       cuhv.creditid;
              `,
                {
                  replacements: { company: unitid },
                  type: models.sequelize.QueryTypes.SELECT,
                  transaction: ta
                }
              );

              for await (const credit of credits) {
                if (credit.amountremaining <= 0) {
                  continue;
                }

                if (
                  position.boughtPlanIds.some(bpId =>
                    credit.spendablefor.includes(bpId)
                  )
                ) {
                  let amount = position.discountedPrice;
                  if (credit.amountremaining <= amount) {
                    amount = credit.amountremaining;
                  }

                  totalCredits += parseFloat(amount);

                  const discountItem = {
                    ...position,
                    description: [
                      { name: Object.keys(credit.source)[0], data: 1 }
                    ],
                    discount: amount
                  };

                  const createCreditPos = await models.BillPosition.create(
                    {
                      billid: bill.id,
                      price: `-${discountItem.discount}`,
                      positiondata: discountItem.description,
                      currency: discountItem.currency,
                      boughtPlanIds: discountItem.boughtPlanIds
                    },
                    { transaction: ta }
                  );

                  const creditPosData = createCreditPos.get();
                  discountItem.id = creditPosData.id;
                  delete discountItem.unitPrice;
                  delete discountItem.discountedPrice;

                  await models.CreditsSpentFor.create(
                    {
                      amount,
                      creditid: credit.creditid,
                      billpositionid: creditPosData.id,
                      billid: bill.id
                    },
                    { transaction: ta }
                  );

                  billItems.credits.push(discountItem);
                }
              }
            }

            const totalCheck = billItems.positions
              .reduce((acc, cV) => acc + parseFloat(cV.unitPrice), 0)
              .toFixed(2);

            if (totalCheck != total) {
              throw new Error("Prices don't match!");
            }

            const number = `V${monthly ? "M" : "S"}-${year}-${bill.id}-01`;

            const data = {
              total: total - totalCredits,
              currency: pos[0].currency,
              invoice: {
                number,
                date,
                dueDate,
                explanation: `Der Betrag wird bis zum ${dueDate} von ihrer Kreditkarte eingezogen.
              Bitte sorgen Sie für eine ausreichende Deckung der Karte.`
              },
              billItems,
              seller: {
                logo: "../files/vipfy-signet.png",
                company: "VIPFY GmbH",
                registrationNumber: "HRB 104968",
                taxId: "DE320082973",
                address: {
                  street: "Campus",
                  number: "A1 1",
                  zip: "66123",
                  city: "Saarbrücken",
                  region: "Saarland",
                  country: "Germany"
                },
                phone: "+49 681 302 - 64936",
                email: "billing@vipfy.store",
                website: "www.vipfy.store",
                bank: {
                  name: "Deutsche Bank",
                  swift: "XXXXXX",
                  iban: "DE51 5907 0000 0012 3018 00"
                }
              },
              buyer: {
                company: company.name,
                // taxId:
                //   company.legalinformation && company.legalinformation.vatId
                //     ? company.legalinformation.vatId
                //     : "",
                address: { street, zip, city, country },
                phone,
                email
              }
            };

            const pathPdf = `${__dirname}/../../files/${number}.pdf`;

            await createInvoice({
              data,
              path: `${__dirname}/../../templates/invoice.html`,
              pathPdf,
              htmlPath: `${__dirname}/../../templates/${number}.html`
            });

            await uploadInvoice(pathPdf, number);

            await models.Bill.update(
              { billname: number, invoicedata: data },
              { where: { id: bill.id }, transaction: ta }
            );
          }
          return true;
        } catch (err) {
          console.log(err);
          throw new BillingError(err.message);
        }
      })
  ),
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
    async (parent, { email }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid, company }
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

          const p1 = createLog(ip, "addBillingEmail", { oldEmail }, unitid, ta);

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
    async (parent, { email }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
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

          const p3 = createLog(ip, "createEmail", { removedEmail }, unitid, ta);

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
            ""
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
