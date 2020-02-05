import { difference, concat } from "lodash";
import { decode } from "jsonwebtoken";
import { requiresRights } from "../../helpers/permissions";

export default {
  fetchRecommendedApps: requiresRights(["view-apps"]).createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);
        const licences = await models.Licence.findAll({ where: { unitid } });
        const ids = await licences.map(licence => licence.get("boughtplanid"));

        const boughtPlans = await models.BoughtPlanView.findAll({
          attributes: ["planid"],
          where: { id: ids }
        });

        const planIds = await boughtPlans.map(bp => bp.get("planid"));
        const filteredIds = await planIds.filter(
          (elem, index, self) => index === self.indexOf(elem)
        );

        const plans = await models.Plan.findAll({
          where: { id: filteredIds }
        });

        const myAppIds = await plans.map(app => app.get("appid"));
        const apps = await models.App.findAll();

        const allAppIds = await apps.map(app => app.get("id"));

        const filteredAppIds = [];
        let endIndex = 3;

        if (!myAppIds.includes("4")) {
          filteredAppIds.push(4);
          endIndex--;
        }

        if (!myAppIds.includes("18")) {
          filteredAppIds.push(18);
          endIndex--;
        }

        const restAppIds = difference(allAppIds, myAppIds).slice(0, endIndex);
        const finalAppIds = concat(restAppIds, filteredAppIds);
        const filteredApps = await models.App.findAll({
          where: { id: finalAppIds }
        });

        return filteredApps;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  )
};
