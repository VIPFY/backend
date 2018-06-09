import { decode } from "jsonwebtoken";
import { requiresVipfyAdmin, requiresAdmin, requiresAuth } from "../../helpers/permissions";
import { createProduct, createPlan } from "../../services/stripe";
import { getDate, formatFilename } from "../../helpers/functions";
import createInvoice from "../../helpers/createInvoice";
import { createDownloadLink } from "../../services/gcloud";
import { createLoginLink } from "../../services/weebly";

/* eslint-disable array-callback-return, consistent-return */

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

  createStripePlan: requiresVipfyAdmin.createResolver(
    async (parent, { name, productid, amount }) => {
      let product;
      if (name && !productid) {
        try {
          const newProduct = await createProduct(name);
          product = newProduct.id;
          console.log({ newProduct });
        } catch ({ message }) {
          throw new Error(message);
        }
      } else product = productid;

      try {
        await createPlan(product, amount);
        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    },
  ),
  // Exchange back to requiresAdmin after Metz and Lissabon
  buyPlan: requiresAuth.createResolver(async (parent, { planid, amount }, { models, token }) =>
    models.sequelize.transaction(async ta => {
      try {
        const billItems = [];
        const billItem = {};
        const { user: { unitid, company } } = decode(token);

        const p1 = models.BoughtPlan.create(
          {
            buyer: unitid,
            payer: company,
            planid,
            disabled: false,
            key: { amount },
          },
          { transaction: ta },
        );

        const p2 = models.Plan.findOne({
          where: { id: planid },
          attributes: ["appid", "name", "price"],
        });
        const [boughtplan, app] = await Promise.all([p1, p2]);

        let key = {};

        if (app.appid == 4) {
          key = { email: "nv@vipfy.vipfy.vipfy.com", password: "12345678" };
        } else if (app.appid == 18) {
          key = { email: "jf@vipfy.com", password: "zdwMYqQPE4gSHr3QQSkm" };
        }

        billItem.description = app.get("name");
        billItem.quantity = boughtplan.get("key").amount;
        billItem.unitPrice = app.get("price");
        billItems.push(billItem);

        const p3 = models.Bill.create({ unitid: company }, { transaction: ta });
        const p4 = models.Licence.create(
          {
            unitid,
            boughtplanid: boughtplan.id,
            starttime: getDate(),
            agreed: true,
            disabled: false,
            key,
          },
          { transaction: ta },
        );

        const results = await Promise.all([p3, p4]);
        const billId = await results[0].get("id");

        const res = await createInvoice(false, models, company, billId, billItems);
        if (res.ok !== true) {
          throw new Error(res.err);
        }

        await models.Bill.update(
          { billname: res.billName },
          { where: { id: billId }, transaction: ta },
        );

        const p5 = models.App.findOne({
          where: { id: app.appid },
          attributes: ["name"],
        });

        const p6 = models.Department.findOne({ where: { unitid: company }, attributes: ["name"] });

        const [isWeebly, business] = await Promise.all([p5, p6]);

        if (isWeebly.name == "Weebly") {
          const email = `user${unitid}.boughtplan${boughtplan.id}@users.vipfy.com`;
          const domain = `${formatFilename(business.name)}.vipfy.com`;
          // Currently we use as id the free plan we have in the database
          const result = await createLoginLink(email, domain, "1");
          key.weeblyid = result.weeblyid;

          await models.Licence.update(
            { key },
            { where: { unitid, boughtplanid: boughtplan.id }, transaction: ta },
          );

          return { ok: true, loginLink: result.loginLink };
        }

        return { ok: res.ok };
      } catch (err) {
        throw new Error(err.message);
      }
    }),
  ),

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
      const { user: { company: unitid } } = decode(token);
      const bill = await models.Bill.create({ unitid });
      const billId = bill.get("id");
      const billItems = [
        {
          description: "Some interesting test",
          quantity: 5,
          unitPrice: 19.99,
        },
        {
          description: "Another interesting test",
          quantity: 10,
          unitPrice: 5.99,
        },
        {
          description: "The most interesting one",
          quantity: 3,
          unitPrice: 9.99,
        },
      ];

      const ok = await createInvoice(true, models, unitid, billId, billItems);
      if (ok !== true) {
        throw new Error(ok);
      }

      return { ok };
    } catch (err) {
      throw new Error(err);
    }
  }),

  addBillPos: requiresAuth.createResolver(async (parent, { bill }, { models, token }) => {
    try {
      const { user: { company } } = decode(token);
      await models.BillPosition.create({ ...bill, unitid: company });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  downloadBill: requiresAuth.createResolver(async (parent, { billid }, { models, token }) => {
    try {
      const { user: { company: unitid } } = await decode(token);
      const bill = await models.Bill.findOne({
        where: { unitid, id: billid },
        attributes: ["billname", "billtime"],
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
  }),

  adminUpdateLicence: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, boughtplanid, licenceData }, { models }) => {
      try {
        console.log(licenceData);
        await models.Licence.update({ ...licenceData }, { where: { unitid, boughtplanid } });

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    },
  ),
};
