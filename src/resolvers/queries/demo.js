import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  fetchRecommendedApps: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { unitid } } = decode(token);
      const licences = await models.Licence.findAll({
        where: { unitid }
      });
      const ids = await licences.map(licence => licence.get("boughtplanid"));

      const boughtPlans = await models.BoughtPlan.findAll({
        attributes: ["planid"],
        where: { buyer: unitid, id: [...ids] }
      });

      const planIds = await boughtPlans.map(bp => bp.get("planid"));
      const filteredIds = await planIds.filter((elem, index, self) => index === self.indexOf(elem));

      const plans = await models.Plan.findAll({
        where: { id: filteredIds }
      });

      const appIds = await plans.map(app => app.get("appid"));
      const apps = await models.App.findAll();

      const finalIds = await apps.map(app => app.get("id"));

      const filteredAppIds = finalIds.filter(id => !appIds.includes(id)).slice(0, 3);
      const filteredApps = await models.App.findAll({ where: { id: filteredAppIds } });
      return filteredApps;
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
