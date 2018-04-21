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

  fetchPlans: async (parent, { appid }, { models }) => {
    const allPlans = await models.Plan.findAll({ where: { appid } });
    const mainPlans = allPlans.filter(plan => plan.mainplan == null);
    mainPlans.forEach(mainPlan => {
      mainPlan.subplans = [];
    });
    const subPlans = allPlans.filter(plan => plan.mainplan != null);
    subPlans.forEach(subPlan => {
      mainPlans.forEach(mainPlan => {
        if (subPlan.mainplan == mainPlan.id) {
          mainPlan.subplans.push(subPlan);
        }
      });
    });
    return mainPlans;
  },

  fetchPlan: (parent, { appid }, { models }) => models.Plan.findById(appid)
};
