import { decode } from "jsonwebtoken";
import { requiresAuth, requiresAdmin } from "../../helpers/permissions";
import { createProduct, createPlan } from "../../services/stripe";

/* eslint array-callback-return: "off" */

export default {
  createPlan: async (parent, { plan }, { models }) => {
    try {
      await models.Plan.create({ ...plan });

      return { ok: true };
    } catch (err) {
      throw new Error(err);
    }
  },

  createStripePlan: requiresAuth.createResolver(async (parent, { name, productid, amount }) => {
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
  }),

  buyPlan: requiresAuth.createResolver(async (parent, { planid }, { models, token }) => {
    const { user: { unitid } } = decode(token);

    const userExists = await models.Unit.findById(unitid);
    if (userExists) {
      return models.sequelize.transaction(async ta => {
        try {
          await models.BoughtPlan.create(
            {
              buyer: unitid,
              planid
            },
            { transaction: ta }
          );
          //
          // await models.Licence.create(
          //   {
          //     boughtplanid: boughtPlan.id,
          //     unitid: buyfor
          //   },
          //   { transaction: ta }
          // );

          return { ok: true };
        } catch ({ message }) {
          throw new Error(message);
        }
      });
    }
    throw new Error("User doesn't exist!");
  }),

  endPlan: requiresAdmin.createResolver(async (parent, { id, enddate }, { models }) => {
    try {
      await models.Plan.update({ enddate }, { where: { id } });

      return { ok: true };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  fetchLicences: requiresAuth.createResolver(async (parent, { appid }, { models, token }) => {
    const { user: { unitid } } = decode(token);

    try {
      const plans = await models.Plan.findAll({
        attributes: ["id"],
        where: { appid }
      });
      const planIds = plans.map(plan => plan.get("id"));

      const boughtPlans = await models.BoughtPlan.findAll({
        where: { buyer: unitid, planid: { [models.sequelize.Op.or]: [...planIds] } }
      });
      const boughtPlanIds = boughtPlans.map(pb => pb.get("id"));

      const licences = await models.Licence.findAll({
        where: { unitid, boughtplanid: { [models.sequelize.Op.or]: [...boughtPlanIds] } }
      });

      await licences.map(licence => {
        if (licence.disabled) {
          licence.set({ agreed: false, key: null });
        }
      });

      return licences;
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
