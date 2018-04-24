import { decode } from "jsonwebtoken";
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
    try {
      const allPlans = await models.Plan.findAll({ where: { appid } });
      // Filter out the main plans
      const mainPlans = allPlans.filter(plan => plan.mainplan == null);
      // Add to each main plan a property sub plan to store them later
      mainPlans.forEach(mainPlan => {
        // eslint-disable-next-line
        mainPlan.subplans = [];
      });
      // Filter out the sub plans
      const subPlans = allPlans.filter(plan => plan.mainplan != null);
      // Add the sub plans to it's main plan
      subPlans.forEach(subPlan => {
        mainPlans.forEach(mainPlan => {
          if (subPlan.mainplan == mainPlan.id) {
            mainPlan.subplans.push(subPlan);
          }
        });
      });

      return mainPlans;
    } catch ({ message }) {
      throw new Error(message);
    }
  },

  fetchPlan: (parent, { planid }, { models }) => models.Plan.findById(planid),

  fetchPayers: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    const { user: { unitid } } = decode(token);
    const payers = [];
    const directParent = await models.ParentUnit.findOne({
      attributes: ["parentunit"],
      where: { childunit: unitid }
    });
    const findRoot = async unit => {
      if (unit == null) {
        return;
      }
      unit = null;
      unit = await models.ParentUnit.findOne({
        attributes: ["parentunit"],
        where: { childunit: unitid }
      });

      if (unit != null) {
        payers.push(unit);
      }
      findRoot(unit);
    };

    findRoot(directParent);
    console.log(payers);
    return payers;
  })
};
