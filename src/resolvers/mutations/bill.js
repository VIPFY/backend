import { decode } from "jsonwebtoken";
import { requiresAdmin, requiresAuth } from "../../helpers/permissions";
import { getDate, formatFilename } from "../../helpers/functions";
import createInvoice from "../../helpers/createInvoice";
import { createDownloadLink } from "../../services/gcloud";
import { createLoginLink } from "../../services/weebly";

/* eslint-disable array-callback-return, no-return-await */

export default {
  createPlan: requiresAdmin.createResolver(async (parent, { plan }, { models }) => {
    try {
      await models.Plan.create({ ...plan });

      return { ok: true };
    } catch (err) {
      throw new Error(err);
    }
  }),

  updatePlan: requiresAdmin.createResolver(async (parent, { plan, id }, { models }) => {
    try {
      await models.Plan.update({ ...plan }, { where: { id } });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  buyPlan: async (parent, { planid, amount, optionalPlanData }, { models, token }) =>
    models.sequelize.transaction(async ta => {
      try {
        const billItems = [];

        // const {
        //   user: { unitid, company }
        // } = decode(token);
        const unitid = 7;
        const company = 14;
        // Versuche amount in Plans zu bekommen! Brauchen wir noch numlicences?
        optionalPlanData.unshift({ amount, planid });
        const optionalPlanIds = optionalPlanData.map(planData => planData.planid);

        const plans = await models.Plan.findAll({
          where: { id: optionalPlanIds },
          attributes: ["price", "id", "appid", "name", "numlicences"],
          raw: true
        });

        plans.forEach(({ price, name, numlicences }) => {
          billItems.push({
            description: name,
            quantity: numlicences,
            unitPrice: price
          });
        });

        const createBoughtPlans = plans.map(
          async plan =>
            await models.BoughtPlan.create(
              {
                buyer: unitid,
                payer: company,
                planid: plan.id,
                disabled: false,
                amount: plan.amount,
                totalprice: plan.price
              },
              { transaction: ta }
            )
        );

        const boughtPlans = await Promise.all(createBoughtPlans);
        const boughtPlanIds = boughtPlans.map(bP => bP.get("id", "amount"));
        /*
        Kauf eines neuen Plans

        Variablen HauptPlanid, Anzahl und ARRAY optionalPlans

        1) Subpläne fetchen

        2) Preis berechnen

        3) Insert into BoughtPlan unter key anzahl und optionen start now totslprice saved

        4) Rechnung erstellen

        5) New Bill_data (generate Name und den Rest halt) -> bekommst billId zurück

        6) BoughtPlan -> planid -> Name, Preis aus DB, amount aus DB

        7) New Bill_position_data
        positiontext: $Name vom Plan$ ($Anzahl Lizenzen$), amount ist Preis, currency ist currency

        */

        const bill = await models.Bill.create({ unitid: company }, { transaction: ta });
        const createLicences = boughtPlanIds.map(async boughtplanid =>
          models.Licence.create(
            {
              unitid,
              boughtplanid,
              starttime: getDate(),
              agreed: true,
              disabled: false
            },
            { transaction: ta }
          )
        );

        await Promise.all(createLicences);

        const res = await createInvoice(false, models, company, bill.id, billItems);
        if (res.ok !== true) {
          throw new Error(res.err);
        }

        await models.Bill.update(
          { billname: res.billName },
          { where: { id: bill.id }, transaction: ta }
        );

        const p1 = models.App.findOne({
          where: { id: plans[0].appid },
          attributes: ["name"]
        });

        const p2 = models.Department.findOne({
          where: { unitid: company },
          attributes: ["name"]
        });

        const [isWeebly, business] = await Promise.all([p1, p2]);

        if (isWeebly.name == "Weebly") {
          const email = `user${unitid}.boughtplan${mainBoughtPlan.id}@users.vipfy.com`;
          const domain = `${formatFilename(business.name)}.vipfy.com`;
          // Currently we use as id the free plan we have in the database
          const result = await createLoginLink(email, domain, "1");
          key.weeblyid = result.weeblyid;

          await models.Licence.update(
            { key },
            { where: { unitid, boughtplanid: mainBoughtPlan.id }, transaction: ta }
          );

          return { ok: true, loginLink: result.loginLink };
        }

        return { ok: res.ok };
      } catch (err) {
        throw new Error(err.message);
      }
    }),

  endPlan: requiresAdmin.createResolver(async (parent, { id, enddate }, { models }) => {
    try {
      await models.Plan.update({ enddate }, { where: { id } });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  createMonthlyBill: requiresAuth.createResolver(async (parent, args, { models, token }) => {
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

      const ok = await createInvoice(true, models, unitid, billid, billItems);
      if (ok !== true) {
        throw new Error(ok);
      }

      return { ok };
    } catch (err) {
      throw new Error(err);
    }
  }),

  addBillPos: requiresAuth.createResolver(async (parent, { bill, billid }, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);
      await models.BillPosition.create({ ...bill, billid, unitid: company });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

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
        throw new Error("Couldn't find invoice!");
      }
      const name = bill.get("billname");
      const time = bill.get("billtime");

      const downloadLink = await createDownloadLink(name, time);

      return downloadLink;
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
