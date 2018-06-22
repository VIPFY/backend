import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  fetchBills: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company: unitid }
      } = decode(token);

      const bills = await models.Bill.findAll({ where: { unitid }, order: [["billtime", "DESC"]] });

      return bills;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  boughtPlans: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);

      const boughtPlans = await models.BoughtPlan.findAll({
        where: { payer: company }
      });
      const ids = await boughtPlans.map(bp => bp.get("id"));
      boughtPlans.forEach(bp => {
        bp.licences = [];
      });

      const licences = await models.Licence.findAll({
        attributes: { exclude: ["key"] },
        where: {
          boughtplanid: { [models.sequelize.Op.or]: [...ids] }
        }
      });

      await boughtPlans.map(boughtPlan =>
        licences.forEach(licence => {
          if (licence.boughtplanid == boughtPlan.id) {
            boughtPlan.licences.push(licence);
          }
        })
      );

      return boughtPlans;
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

  fetchPlan: (parent, { planid }, { models }) => models.Plan.findById(planid)
};
