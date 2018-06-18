import { decode } from "jsonwebtoken";
import { requiresAdmin, requiresAuth } from "../../helpers/permissions";
import createInvoice from "../../helpers/createInvoice";
import { createDownloadLink } from "../../services/gcloud";

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

  buyPlan: async (parent, { planIds }, { models }) =>
    models.sequelize.transaction(async ta => {
      try {
        const billItems = [];
        let boughtPlans = [];
        // const {
        //   user: { unitid, company }
        // } = decode(token);
        const unitid = 7;
        const company = 14;

        const plans = await models.Plan.findAll({
          where: { id: planIds },
          attributes: ["price", "id", "name", "numlicences"],
          raw: true
        });

        plans.forEach(({ price, name, numlicences }) => {
          billItems.push({
            description: name,
            quantity: numlicences,
            unitPrice: price
          });
        });

        const mainPlan = plans.shift();

        const createMainBoughtPlan = await models.BoughtPlan.create(
          {
            buyer: unitid,
            payer: company,
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

        const bill = await models.Bill.create({ unitid: company }, { transaction: ta });
        const createLicences = [];

        await boughtPlans.forEach(plan => {
          for (let i = 0; i < plan.amount; i++) {
            createLicences.push(
              models.Licence.create(
                {
                  unitid: null,
                  boughtplanid: plan.id,
                  agreed: false,
                  disabled: false
                },
                { transaction: ta }
              )
            );
          }
        });

        await Promise.all(createLicences);

        const res = await createInvoice(false, models, company, bill.id, billItems);
        if (res.ok !== true) {
          throw new Error(res.err);
        }

        await models.Bill.update(
          { billname: res.billName },
          { where: { id: bill.id }, transaction: ta }
        );

        const createBillPositions = boughtPlans.map(
          async plan =>
            await models.BillPosition.create(
              {
                billid: bill.id,
                positiontext: `Plan ${plan.planid}, Licences ${plan.amount}`,
                price: plan.totalprice,
                planid: plan.planid,
                currency: "USD"
              },
              { transaction: ta }
            )
        );

        await Promise.all(createBillPositions);

        return { ok: true };
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
