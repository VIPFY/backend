import { decode } from "jsonwebtoken";
import { weeblyApi } from "../../services/weebly";
import { requiresAuth } from "../../helpers/permissions";

export default {
  allApps: (parent, { limit, offset, sortOptions }, { models }) =>
    models.AppDetails.findAll({
      limit,
      offset,
      attributes: [
        "id",
        "icon",
        "logo",
        "disabled",
        "name",
        "teaserdescription",
        "features",
        "cheapestprice",
        "avgstars",
        "cheapestpromo"
      ],
      order: sortOptions ? [[sortOptions.name, sortOptions.order]] : ""
    }),

  fetchApp: (parent, { name }, { models }) => models.AppDetails.findOne({ where: { name } }),
  fetchAppById: (parent, { id }, { models }) => models.AppDetails.findById(id),

  // Not needed till now, maybe delete
  fetchUserApps: async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);
      const licences = await models.Licence.findAll({ where: { unitid } });

      return licences;
    } catch ({ message }) {
      throw new Error(message);
    }
  },

  fetchLicences: requiresAuth.createResolver(
    async (parent, { boughtplanid }, { models, token }) => {
      const startTime = Date.now();
      try {
        const {
          user: { unitid }
        } = decode(token);
        let licences;

        if (boughtplanid) {
          licences = await models.Licence.findAll({ where: { unitid, boughtplanid } });
        } else {
          licences = await models.Licence.findAll({
            where: { unitid }
          });
        }

        await licences.forEach(licence => {
          if (licence.disabled) {
            licence.set({ agreed: false, key: null });
          }

          if (Date.parse(licence.starttime) > startTime || !licence.agreed) {
            licence.set({ key: null });
          }

          if (licence.endtime) {
            if (Date.parse(licence.endtime) < startTime) {
              licence.set({ key: null });
            }
          }
        });

        return licences;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  fetchLicencesByApp: requiresAuth.createResolver(async (parent, { appid }, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);
      const plans = await models.Plan.findAll({
        attributes: ["id"],
        where: { appid }
      });
      const planIds = plans.map(plan => plan.get("id"));

      if (planIds.length == 0) {
        throw new Error("This App has no plans!");
      }

      const boughtPlans = await models.BoughtPlan.findAll({
        where: { planid: { [models.sequelize.Op.in]: [...planIds] } }
      });
      const boughtPlanIds = boughtPlans.map(pb => pb.get("id"));

      const licences = await models.Licence.findAll({
        where: { unitid, boughtplanid: { [models.sequelize.Op.in]: [...boughtPlanIds] } }
      });

      await licences.forEach(licence => {
        if (licence.disabled) {
          licence.set({ agreed: false, key: null });
        }
      });

      return licences;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  // change to requiresAdmin in Production!
  createLoginLink: requiresAuth.createResolver(
    async (parent, { boughtplanid }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);
        const licenceBelongsToUser = await models.Licence.findOne({
          where: { unitid, boughtplanid }
        });

        if (!licenceBelongsToUser) {
          throw new Error("This licence doesn't belong to this user!");
        }

        const credentials = licenceBelongsToUser.get("key");
        const endpoint = `user/${credentials.weeblyid}/loginLink`;
        const res = await weeblyApi("POST", endpoint, "");

        return {
          ok: true,
          loginLink: res.link
        };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  )
};
