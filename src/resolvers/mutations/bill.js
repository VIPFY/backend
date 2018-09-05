import { decode } from "jsonwebtoken";
import { assign } from "lodash";
import moment from "moment";
import * as Services from "@vipfy-private/services";
import dd24Api from "../../services/dd24";
import { requiresRight, requiresAuth } from "../../helpers/permissions";
import { recursiveAddressCheck, createLog } from "../../helpers/functions";
import { calculatePlanPrice } from "../../helpers/apps";

// import createInvoice from "../../helpers/createInvoice";
import { invoiceLink } from "../../services/gcloud";
import {
  createCustomer,
  listCards,
  addCard,
  createSubscription
} from "../../services/stripe";
import { BillingError, PartnerError } from "../../errors";
import logger from "../../loggers";

/* eslint-disable array-callback-return, no-return-await, prefer-destructuring */

export default {
  /**
   * Add a credit card to a department. We will only save a token representation
   * from stripe. Create a new User if none exists
   * @param data: string
   * @param departmentid: integer
   */
  addPaymentData: requiresRight(["admin", "addPayment"]).createResolver(
    async (parent, { data, departmentid }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

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

          await createLog(ip, "addPaymentData", logArgs, unitid, ta);

          return { ok: true };
        } catch (err) {
          throw new BillingError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  /**
   * Buy a plan. The customer needs a valid credit card for this
   * @param planIds: integer[]
   * @param options: object
   */
  buyPlan: requiresRight(["admin", "buyApps"]).createResolver(
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
            features
          );
          logger.debug(`calulated price: ${calculatedPrice}, supplied price: ${price}`);
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
            if (fkey in mergedFeatures) {
              mergedFeatures[fkey] += features[fkey];
            } else {
              mergedFeatures[fkey] = features[fkey];
            }
          }

          logger.debug("mergedFeatures", { mergedFeatures });

          // const stripePlans = [];
          /* billItems.push({
            description: plan.name,
            quantity: numlicences,
            unitPrice: plan.price
          });

          stripePlans.push({ plan: plan.stripedata.id }); */

          let partnerLogs = {};

          const createBoughtPlan = await models.BoughtPlan.create(
            {
              buyer: unitid,
              payer: company,
              usedBy: company,
              planid: plan.id,
              disabled: false,
              totalprice: plan.price,
              additionalfeatures: features,
              totalfeatures: mergedFeatures
            },
            {
              transaction: ta
            }
          );
          const boughtPlan = createBoughtPlan.get();

          logger.debug("createdBoughtPlan", { boughtPlan });

          if (plan.appid !== 11) {
            /* const { dns } = await Services.createAccount(
              models,
              boughtPlan.appid,
              planinputs,
              plan.id,
              mergedFeatures,
              boughtPlan.id,
              ta
            );
            if (dns && dns.length > 0) {
              throw new Error("setting dns settings not implemented yet");
            } */
            logger.debug("created Service Account");
          } else {
            if (planinputs.whoisPrivacy) {
              key.whoisPrivacy = true;
            }

            const hasAccount = await models.sequelize.query(
              `SELECT ld.id, ld.key FROM licence_data ld INNER JOIN
                  boughtplan_data bpd on ld.boughtplanid = bpd.id WHERE
                  bpd.planid IN (25, 48, 49, 50, 51, 52, 53) AND ld.unitid = :unitid LIMIT 1;`,
              {
                replacements: { unitid },
                type: models.sequelize.QueryTypes.SELECT
              }
            );

            planinputs.period = 1;
            planinputs.renewalmode = "autorenew";

            key.domain = planinputs.domain.toLowerCase();
            key.renewalmode = "1";
            let registerDomain;

            if (hasAccount.length > 0) {
              planinputs.cid = hasAccount[0].key.cid;
              registerDomain = await dd24Api("AddDomain", planinputs);
            } else {
              const accountData = await models.sequelize.query(
                `SELECT title, firstname, lastname, ad.address, ad.country,
                    ed.email, pd.number as phone FROM human_data hd INNER JOIN
                    address_data ad ON ad.unitid = hd.unitid INNER JOIN
                    email_data ed ON ed.unitid = hd.unitid INNER JOIN phone_data pd
                    ON pd.unitid = hd.unitid WHERE hd.unitid = :unitid AND
                    ('domain' = ANY(ad.tags) OR 'main' = ANY(ad.tags)) AND
                    ed.verified = TRUE AND ed.autogenerated = TRUE`,
                {
                  replacements: { unitid },
                  type: models.sequelize.QueryTypes.SELECT
                }
              );

              const accountDataCorrect = recursiveAddressCheck(accountData);

              if (!accountDataCorrect) {
                throw new PartnerError({
                  internalData: { partner: "DD24" },
                  message:
                    "Please make sure you have a valid address and retry then."
                });
              }

              const { address, ...account } = accountDataCorrect;
              const { street, zip, city } = address;

              const newOptions = assign(planinputs, {
                street,
                zip,
                city,
                ...account
              });

              const organization = await models.Department.findOne({
                attributes: ["name"],
                raw: true,
                where: { unitid: company }
              });
              newOptions.organization = organization.name;

              registerDomain = await dd24Api("AddDomain", newOptions);
              partnerLogs = newOptions;
              partnerLogs.domain = registerDomain;
            }
            if (registerDomain.code == 200) {
              key.cid = registerDomain.cid;
            } else {
              throw new PartnerError({
                internalData: { partner: "DD24" },
                message: registerDomain.description
              });
            }
          }

          const createLicences = [];

          if (plan.appid == 11) {
            const endtime = moment(Date.now())
              .add(1, "year")
              .subtract(1, "day");

            const createLicence = models.Licence.create(
              {
                unitid,
                boughtplanid: boughtPlan.id,
                endtime,
                agreed: false,
                disabled: false,
                key
              },
              { transaction: ta }
            );

            const createRight = models.Right.create(
              {
                holder: unitid,
                forunit: company,
                type: "managedomains"
              },
              { transaction: ta }
            );

            const res = await Promise.all([createRight, createLicence]);
            const right = res[0].get();
            const domainLicence = res[1].get();

            partnerLogs.right = right;
            partnerLogs.domainLicence = domainLicence;
          } else {
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
          }

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

          return { ok: true };
        });
      } catch (err) {
        logger.error(err);
        throw new BillingError({
          message: err.message,
          internalData: { err, planid, features, price, planinputs, unitid }
        });
      }
    }
  ),
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
  // TODO: Add logging when changed
  downloadBill: requiresAuth.createResolver(
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
