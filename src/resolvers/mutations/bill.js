import { decode } from "jsonwebtoken";
import { requiresVipfyAdmin, requiresAdmin } from "../../helpers/permissions";
import { createProduct, createPlan } from "../../services/stripe";

/* eslint array-callback-return: "off" */

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

  buyPlan: requiresAdmin.createResolver(async (parent, { planid, amount }, { models, token }) => {
    try {
      const { user: { unitid, company } } = decode(token);
      await models.BoughtPlan.create({
        buyer: unitid,
        payer: company,
        planid,
        key: { amount }
      });

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  endPlan: requiresAdmin.createResolver(async (parent, { id, enddate }, { models }) => {
    try {
      await models.Plan.update({ enddate }, { where: { id } });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
