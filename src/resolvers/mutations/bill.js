import { decode } from "jsonwebtoken";
import { requiresVipfyAdmin, requiresAdmin, requiresAuth } from "../../helpers/permissions";
import { createProduct, createPlan } from "../../services/stripe";
import { getDate, createBill } from "../../helpers/functions";

/* eslint array-callback-return: "off", max-len: "off" */

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
    }
  ),
  // Exchange back to requiresAdmin after Metz and Lissabon
  buyPlan: requiresAuth.createResolver(async (parent, { planid, amount }, { models, token }) =>
    models.sequelize.transaction(async ta => {
      try {
        const { user: { unitid, company } } = decode(token);
        const p1 = models.BoughtPlan.create(
          {
            buyer: unitid,
            payer: company,
            planid,
            disabled: false,
            key: { amount }
          },
          { transaction: ta }
        );

        const p2 = models.Plan.findOne({ where: { id: planid }, attributes: ["appid"] });
        const [boughtplan, app] = await Promise.all([p1, p2]);

        let key;

        if (app.appid == 4) {
          key = { email: "nv@vipfy.vipfy.com", password: "12345678" };
        } else {
          key = { email: "jf@vipfy.com", password: "zdwMYqQPE4gSHr3QQSkm" };
        }

        const p3 = models.Bill.create({ unitid: company });

        const p4 = models.Licence.create(
          {
            unitid,
            boughtplanid: boughtplan.id,
            starttime: getDate(),
            agreed: true,
            disabled: false,
            key
          },
          { transaction: ta }
        );

        await Promise.all([p3, p4]);

        return { ok: true };
      } catch ({ message }) {
        throw new Error(message);
      }
    })
  ),

  endPlan: requiresAdmin.createResolver(async (parent, { id, enddate }, { models }) => {
    try {
      await models.Plan.update({ enddate }, { where: { id } });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  createBill: async (parent, { monthly }, { models, token }) => {
    try {
      const bill = { contact: {}, single: true };
      if (monthly) {
        bill.single = false;
      }

      const tag = "billing";
      const { user: { company: unitid } } = decode(token);

      const p1 = models.Address.findOne({
        attributes: ["country", "address"],
        where: { unitid, tag }
      });
      const p2 = models.Email.findOne({ attributes: ["email"], where: { unitid, tag } });
      const p3 = models.Phone.findOne({ attributes: ["number"], where: { unitid, tag } });
      const p4 = models.Department.findOne({ attributes: ["name"], where: { unitid } });
      const p5 = models.Bill.create({ unitid });
      const [address, email, phone, company, id] = await Promise.all([p1, p2, p3, p4, p5]);

      bill.address = address.get();
      bill.contact.email = email.get().email;
      bill.contact.phone = phone.get().number;
      bill.company = company.get().name;
      bill.id = id.get().id;
      await createBill(bill);

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  },

  addBillPos: requiresAuth.createResolver(async (parent, { bill }, { models, token }) => {
    try {
      const { user: { company } } = decode(token);
      await models.BillPosition.create({ ...bill, unitid: company });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
