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
  fetchAppById: (parent, { id }, { models }) => models.AppDetails.findById(id),

  // Not needed till now, maybe delete
  fetchUserApps: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { unitid } } = decode(token);
      const boughtPlans = await models.BoughtPlan.findAll({ where: { payer: unitid } });

      return boughtPlans;
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
