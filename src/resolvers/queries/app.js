import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  allApps: (parent, { first }, { models }) => {
    if (first) {
      return models.AppDetails.findAll().then(res => res.slice(0, first));
    }
    return models.AppDetails.findAll();
  },

  fetchApp: (parent, { name }, { models }) => models.AppDetails.findOne({ where: { name } }),

  fetchUserApps: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { unitid } } = decode(token);
      const boughtPlans = await models.BoughtPlan.findAll({ where: { buyfor: unitid } });

      return boughtPlans;
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  fetchPlans: (parent, { appid }, { models }) => models.Plan.findAll({ where: { appid } }),

  fetchPlan: (parent, { appid }, { models }) => models.Plan.findById(appid)
};
