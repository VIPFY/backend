import { decode } from "jsonwebtoken";
import { requiresAuth, requiresRight } from "../../helpers/permissions";
// import { fetchCustomer } from "../../services/stripe";
import { NormalError } from "../../errors";

export default {
  boughtPlans: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);

      const boughtPlans = await models.BoughtPlan.findAll({
        where: { usedby: company }
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
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  fetchBills: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company: unitid }
      } = decode(token);

      const bills = await models.Bill.findAll({ where: { unitid }, order: [["billtime", "DESC"]] });

      return bills;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  fetchPaymentData: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);

      const paymentData = await models.Unit.findOne({
        where: { id: company },
        attributes: ["payingoptions"],
        raw: true
      });

      return paymentData.payingoptions.stripe.cards;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  fetchPlans: async (parent, { appid }, { models }) => {
    try {
      const allPlans = await models.Plan.findAll({ where: { appid }, order: [["price", "ASC"]] });
      // Filter out the main plans
      const mainPlans = allPlans.filter(
        plan => plan.mainplan == null && (plan.enddate > Date.now() || plan.enddate == null)
      );
      // Add to each main plan a property sub plan to store them later
      mainPlans.forEach(mainPlan => {
        mainPlan.subplans = [];
      });
      // Filter out the sub plans
      const subPlans = allPlans.filter(plan => plan.mainplan != null);
      // Add the sub plans to it's main plan
      subPlans.forEach(subPlan => {
        if (subPlan.enddate == null || subPlan.enddate > Date.now()) {
          mainPlans.forEach(mainPlan => {
            if (
              subPlan.mainplan == mainPlan.id &&
              (mainPlan.enddate == null || mainPlan.enddate > Date.now())
            ) {
              mainPlan.subplans.push(subPlan);
            }
          });
        }
      });

      return mainPlans;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  fetchPlan: (parent, { planid }, { models }) => models.Plan.findById(planid),

  fetchBillingAddresses: requiresRight(["buyapps", "admin"]).createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const addresses = await models.Address.findAll({
          where: { unitid: company, tags: ["billing"] }
        });

        return addresses;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
