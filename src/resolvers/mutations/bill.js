import { decode } from "jsonwebtoken";
import { assign } from "lodash";
import moment from "moment";
import dd24Api from "../../services/dd24";
import { requiresRight, requiresAuth } from "../../helpers/permissions";
import { recursiveAddressCheck } from "../../helpers/functions";
// import createInvoice from "../../helpers/createInvoice";
import { createDownloadLink } from "../../services/gcloud";
import { createCustomer, listCards, addCard, createSubscription } from "../../services/stripe";
import { BillingError, PartnerError } from "../errors";

/* eslint-disable array-callback-return, no-return-await, prefer-destructuring */

export default {
  /**
   * Add a credit card to a department. We will only save a token representation
   * from stripe. Create a new User if none exists
   * @param data: string
   * @param departmentid: integer
   */
  addPaymentData: requiresRight(["admin", "addPayment"]).createResolver(
    async (parent, { data, departmentid }, { models }) => {
      try {
        const department = await models.Unit.findById(departmentid, { raw: true });

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
            { where: { id: departmentid }, raw: true }
          );
        } else {
          const card = await addCard(department.payingoptions.stripe.id, data.id);
          await models.Unit.update(
            {
              payingoptions: {
                stripe: {
                  ...department.payingoptions.stripe,
                  cards: [...department.payingoptions.stripe.cards, { ...card }]
                }
              }
            },
            { where: { id: departmentid }, raw: true }
          );
        }

        return { ok: true };
      } catch (err) {
        throw new BillingError({ message: err.message });
      }
    }
  ),

  /**
   * Buy a plan. The customer needs a valid credit card for this
   * @param planIds: integer[]
   * @param options: object
   */
  buyPlan: requiresRight(["admin", "buyApps"]).createResolver(
    async (parent, { planIds, options }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const billItems = [];
          let boughtPlans = [];
          const key = {};

          const {
            user: { unitid, company }
          } = decode(token);

          const department = await models.Unit.findById(company, { raw: true });
          // TODO: check whether the card is valid
          if (
            !department.payingoptions ||
            !department.payingoptions.stripe ||
            !department.payingoptions.stripe.cards ||
            department.payingoptions.stripe.cards.length < 1
          ) {
            throw new BillingError({ message: "Missing payment information!" });
          }

          const plans = await models.Plan.findAll({
            where: { id: planIds },
            attributes: ["price", "id", "appid", "name", "numlicences", "enddate", "stripedata"],
            raw: true
          });

          const stripePlans = [];
          plans.forEach(({ price, name, numlicences, enddate, stripedata }) => {
            if (enddate && enddate < Date.now()) {
              throw new BillingError({ message: `The plan ${name} has already expired!` });
            }

            billItems.push({
              description: name,
              quantity: numlicences,
              unitPrice: price
            });

            stripePlans.push({ plan: stripedata.id });
          });

          const mainPlan = plans.shift();

          switch (mainPlan.appid) {
            case 26:
              console.log("SendinBlue");
              break;

            case "11":
              {
                if (options.whoisPrivacy) {
                  key.whoisPrivacy = true;
                }

                const hasAccount = await models.sequelize.query(
                  `SELECT ld.id, ld.key FROM licence_data ld INNER JOIN
                  boughtplan_data bpd on ld.boughtplanid = bpd.id WHERE
                  bpd.planid IN (25, 48, 49, 50, 51, 52, 53) AND ld.unitid = :unitid LIMIT 1;`,
                  { replacements: { unitid }, type: models.sequelize.QueryTypes.SELECT }
                );

                options.period = 1;
                options.renewalmode = "autorenew";

                key.domain = options.domain.toLowerCase();
                key.renewalmode = "1";
                let registerDomain;

                if (hasAccount.length > 0) {
                  options.cid = hasAccount[0].key.cid;
                  registerDomain = await dd24Api("AddDomain", options);
                } else {
                  const accountData = await models.sequelize.query(
                    `SELECT title, firstname, lastname, ad.address, ad.country,
                    ed.email, pd.number as phone FROM human_data hd INNER JOIN
                    address_data ad ON ad.unitid = hd.unitid INNER JOIN
                    email_data ed ON ed.unitid = hd.unitid INNER JOIN phone_data pd
                    ON pd.unitid = hd.unitid WHERE hd.unitid = :unitid AND
                    ('domain' = ANY(ad.tags) OR 'main' = ANY(ad.tags)) AND
                    ed.verified = TRUE AND ed.autogenerated = TRUE`,
                    { replacements: { unitid }, type: models.sequelize.QueryTypes.SELECT }
                  );

                  const accountDataCorrect = recursiveAddressCheck(accountData);

                  if (!accountDataCorrect) {
                    throw new PartnerError({
                      internalData: { partner: "DD24" },
                      message: "Please make sure you have a valid address and retry then."
                    });
                  }

                  const { address, ...account } = accountDataCorrect;
                  const { street, zip, city } = address;

                  const newOptions = assign(options, { street, zip, city, ...account });

                  const organization = await models.Department.findOne({
                    attributes: ["name"],
                    raw: true,
                    where: { unitid: company }
                  });
                  newOptions.organization = organization.name;

                  registerDomain = await dd24Api("AddDomain", newOptions);
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
              break;

            default:
              console.log("Not specified yet");
          }

          const createMainBoughtPlan = await models.BoughtPlan.create(
            {
              buyer: unitid,
              payer: company,
              usedBy: company,
              planid: mainPlan.id,
              disabled: false,
              amount: mainPlan.numlicences,
              totalprice: mainPlan.price
            },
            {
              transaction: ta
            }
          );
          const mainBoughtPlan = createMainBoughtPlan.get();

          if (plans.length > 0) {
            const createSubBoughtPlans = plans.map(
              async plan =>
                await models.BoughtPlan.create(
                  {
                    buyer: unitid,
                    payer: company,
                    usedBy: company,
                    planid: plan.id,
                    disabled: false,
                    amount: plan.numlicences,
                    totalprice: plan.price,
                    mainboughtplan: mainBoughtPlan.id
                  },
                  { transaction: ta }
                )
            );

            const boughtPlansData = await Promise.all(createSubBoughtPlans);
            boughtPlans = boughtPlansData.map(bP => bP.get());
          }

          boughtPlans.splice(0, 0, mainBoughtPlan);
          const createLicences = [];

          if (mainPlan.appid == 11) {
            const endtime = moment(Date.now())
              .add(1, "year")
              .subtract(1, "day");

            const domainLicence = models.Licence.create(
              {
                unitid,
                boughtplanid: boughtPlans[0].id,
                endtime,
                agreed: false,
                disabled: false,
                key
              },
              { transaction: ta }
            );

            const right = models.Right.create(
              {
                holder: unitid,
                forunit: company,
                type: "managedomains"
              },
              { transaction: ta }
            );

            await Promise.all[(domainLicence, right)];
          } else {
            await boughtPlans.forEach(plan => {
              for (let i = 0; i < plan.amount; i++) {
                createLicences.push(
                  models.Licence.create(
                    {
                      unitid: null,
                      boughtplanid: plan.id,
                      agreed: false,
                      disabled: false,
                      key
                    },
                    { transaction: ta }
                  )
                );
              }
            });

            await Promise.all(createLicences);
          }

          await createSubscription(department.payingoptions.stripe.id, stripePlans);
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

          return { ok: true };
        } catch (err) {
          throw new BillingError({ message: err.message });
        }
      })
  ),

  createMonthlyBill: async (parent, args, { models, token }) => {
    try {
      const {
        user: { company: unitid }
      } = decode(token);
      const bill = await models.Bill.create({ unitid });
      const billid = bill.get("id");
      const billItems = await models.BillPosition.findAll({ where: { billid } });
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
      throw new BillingError({ message: err.message });
    }
  },

  addBillPos: requiresAuth.createResolver(async (parent, { bill, billid }, { models, token }) =>
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
        throw new BillingError({ message: err.message });
      }
    })
  ),

  downloadBill: requiresAuth.createResolver(async (parent, { billid }, { models, token }) => {
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

      const downloadLink = await createDownloadLink(name, time);

      return downloadLink;
    } catch (err) {
      throw new BillingError({ message: err.message });
    }
  })
};
