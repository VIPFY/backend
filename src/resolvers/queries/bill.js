import { decode } from "jsonwebtoken";
import { requiresAuth, requiresVipfyAdmin } from "../../helpers/permissions";
import { weeblyApi } from "../../services/weebly";

/* eslint-disable no-param-reassign, array-callback-return */

export default {
  fetchBills: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { company: unitid } } = decode(token);

      const bills = await models.Bill.findAll({ where: { unitid }, order: [["billtime", "DESC"]] });

      return bills;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  boughtPlans: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { company } } = decode(token);
      const boughtPlans = await models.BoughtPlan.findAll({ where: { payer: company } });
      const ids = await boughtPlans.map(bp => bp.get("id"));
      boughtPlans.forEach(bp => {
        bp.licences = [];
      });

      const licences = await models.Licence.findAll({
        attributes: { exclude: ["key"] },
        where: { boughtplanid: { [models.sequelize.Op.or]: [...ids] } },
      });

      await boughtPlans.map(boughtPlan =>
        licences.map(licence => {
          if (licence.boughtplanid == boughtPlan.id) {
            boughtPlan.licences.push(licence);
          }
        }),
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

  fetchLicences: requiresAuth.createResolver(
    async (parent, { boughtplanid }, { models, token }) => {
      const startTime = Date.now();
      try {
        const { user: { unitid } } = decode(token);
        let licences;

        if (boughtplanid) {
          licences = await models.Licence.findAll({ where: { unitid, boughtplanid } });
        } else {
          licences = await models.Licence.findAll({ where: { unitid } });
        }

        await licences.map(licence => {
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
    },
  ),

  adminFetchLicences: requiresVipfyAdmin.createResolver(async (parent, { id }, { models }) => {
    try {
      const licences = await models.Licence.findAll({ where: { unitid: id } });

      return licences;
    } catch (err) {
      throw new Error(err);
    }
  }),

  adminFetchLicence: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, boughtplanid }, { models }) => {
      try {
        const licence = await models.Licence.findOne({ where: { unitid, boughtplanid } });

        return licence;
      } catch (err) {
        throw new Error(err);
      }
    },
  ),

  fetchLicencesByApp: requiresAuth.createResolver(async (parent, { appid }, { models, token }) => {
    try {
      const { user: { unitid } } = decode(token);
      const plans = await models.Plan.findAll({
        attributes: ["id"],
        where: { appid },
      });
      const planIds = plans.map(plan => plan.get("id"));

      if (planIds.length == 0) {
        throw new Error("This App has no plans!");
      }

      const boughtPlans = await models.BoughtPlan.findAll({
        where: { planid: { [models.sequelize.Op.in]: [...planIds] } },
      });
      const boughtPlanIds = boughtPlans.map(pb => pb.get("id"));

      const licences = await models.Licence.findAll({
        where: { unitid, boughtplanid: { [models.sequelize.Op.in]: [...boughtPlanIds] } },
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
  }),

  // change to requiresAdmin in Production!
  createLoginLink: requiresAuth.createResolver(
    async (parent, { boughtplanid }, { models, token }) => {
      try {
        const { user: { unitid } } = decode(token);
        const licenceBelongsToUser = await models.Licence.findOne({
          where: { unitid, boughtplanid },
        });

        if (!licenceBelongsToUser) {
          throw new Error("This licence doesn't belong to this user!");
        }

        const credentials = licenceBelongsToUser.get("key");
        const endpoint = `user/${credentials.weeblyid}/loginLink`;
        const res = await weeblyApi("POST", endpoint, "");

        return {
          ok: true,
          loginLink: res.link,
        };
      } catch (err) {
        throw new Error(err.message);
      }
    },
  ),

  fetchPlan: (parent, { planid }, { models }) => models.Plan.findById(planid),

  // fetchPayers: requiresAuth.createResolver(async (parent, args, { models, token }) => {
  //   const { user: { unitid } } = decode(token);
  //   const payers = [];
  //   const directParent = await models.ParentUnit.findOne({
  //     attributes: ["parentunit"],
  //     where: { childunit: unitid }
  //   });
  //   const findRoot = async unit => {
  //     if (unit == null) {
  //       return;
  //     }
  //     unit = null;
  //     unit = await models.ParentUnit.findOne({
  //       attributes: ["parentunit"],
  //       where: { childunit: unitid }
  //     });
  //
  //     if (unit != null) {
  //       payers.push(unit);
  //     }
  //     findRoot(unit);
  //   };
  //
  //   findRoot(directParent);
  //   console.log(payers);
  //   return payers;
  // })
};
