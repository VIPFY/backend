import { decode } from "jsonwebtoken";
import * as Services from "@vipfy-private/services";
import { requiresRights } from "../../helpers/permissions";
// import { fetchCustomer } from "../../services/stripe";
import { NormalError } from "../../errors";

export default {
  boughtPlans: requiresRights(["view-boughtplans"]).createResolver(
    async (parent, args, { models, token }) => {
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
    }
  ),

  fetchBills: requiresRights([
    "view-paymentdata",
    "view-addresses"
  ]).createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company: unitid }
      } = decode(token);

      const bills = await models.Bill.findAll({
        where: { unitid },
        order: [["billtime", "DESC"]]
      });

      return bills;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  fetchPaymentData: requiresRights(["view-paymentdata"]).createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const paymentData = await models.Unit.findOne({
          where: { id: company },
          attributes: ["payingoptions"],
          raw: true
        });

        if (
          !paymentData.payingoptions ||
          !paymentData.payingoptions.stripe ||
          paymentData.payingoptions.stripe.cards.length == 0
        ) {
          return [];
        }

        return paymentData.payingoptions.stripe.cards;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchPlans: async (parent, { appid }, { models }) => {
    try {
      const app = await models.App.findOne({
        where: { id: appid, disabled: false, deprecated: false }
      });

      if (!app) {
        throw new Error("App unknown or disabled/deprecated");
      }

      const allPlans = await models.sequelize.query(
        `Select *
          FROM plan_data
          WHERE appid = :appid
          AND (enddate >= now() OR enddate is null)
          AND (startdate <= now() OR startdate is null)
          AND not plan_data.hidden
          ORDER BY price ASC`,
        {
          replacements: { appid },
          type: models.sequelize.QueryTypes.SELECT
        }
      );

      return allPlans;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  fetchPlanInputs: requiresRights(["view-apps"]).createResolver(
    async (parent, { planid }, { models }) => {
      const plan = await models.Plan.findById(planid, { raw: true });
      return Services.getPlanBuySchema(plan.appid);
    }
  ),

  fetchBillingEmails: async (parent, args, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);

      const emails = models.DepartmentEmail.findAll({
        where: { departmentid: company, tags: ["billing"] }
      });

      return emails;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }
};
