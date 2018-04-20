import { requiresAuth } from "../../helpers/permissions";

export default {
  boughtPlans: requiresAuth.createResolver(async (parent, { unitid }, { models }) => {
    const userExists = await models.Unit.findById(unitid);
    if (!userExists) throw new Error("Couldn't find User!");

    try {
      const plans = await models.BoughtPlan.findAll({ where: { buyer: unitid } });

      return plans;
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  fetchPlans: (parent, { appid }, { models }) => models.Plan.findAll({ where: { appid } }),

  fetchPlan: (parent, { appid }, { models }) => models.Plan.findById(appid)
};
