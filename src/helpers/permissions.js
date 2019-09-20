/*
 * This file contains a Higher Order Component which can be used to create
 * Authentication logic. The base function lets you stack several permissions,
 * they just have to wrapped around the component which shall be protected.
 */

import { decode } from "jsonwebtoken";
import { checkRights } from "@vipfy-private/messaging";
import { checkCompanyMembership } from "./companyMembership";
import { AuthError, AdminError, RightsError } from "../errors";

const createResolver = resolver => {
  const baseResolver = resolver;
  baseResolver.createResolver = childResolver => {
    const newResolver = async (parent, args, context, info) => {
      await resolver(parent, args, context, info);
      return childResolver(parent, args, context, info);
    };
    return createResolver(newResolver);
  };
  return baseResolver;
};

// Check whether the user is authenticated
export const requiresAuth = createResolver(
  async (_parent, _args, ctx) => {
    try {
      const { models, token } = ctx;

      if (!token || token == "null") {
        throw new Error("No valid token received!");
      }

      const {
        user: { company, unitid }
      } = decode(token);

      const valid = models.User.findOne({
        where: { id: unitid },
        raw: true
      });

      if (!valid || valid.deleted || valid.suspended || valid.banned) {
        throw new Error("Login is currently not possible for you!");
      }

      const vipfyPlans = await models.Plan.findAll({
        where: { appid: 66 },
        attributes: ["id"],
        raw: true
      });

      const planIds = vipfyPlans.map(plan => plan.id);

      let vipfyPlan = await models.BoughtPlan.findOne({
        where: {
          payer: company,
          endtime: {
            [models.Op.or]: {
              [models.Op.gt]: models.sequelize.fn("NOW"),
              [models.Op.eq]: null
            }
          },
          planid: { [models.Op.in]: planIds }
        }
      });

      if (!vipfyPlan) {
        vipfyPlan = await models.BoughtPlan.create({
          planid: 125,
          payer: company,
          usedby: company,
          buyer: unitid,
          totalprice: 0,
          disabled: false
        });
      }
    } catch (error) {
      throw new AuthError(error.message);
    }
  }
  // all other cases handled by auth middleware
);

export const requiresDepartmentCheck = requiresAuth.createResolver(
  async (_parent, args, { models, token }) => {
    try {
      if (args.departmentid) {
        const {
          user: { company }
        } = decode(token);

        await checkCompanyMembership(
          models,
          company,
          args.departmentid,
          "department"
        );
      }
    } catch (err) {
      throw new AuthError(err);
    }
  }
);

export const requiresRights = rights =>
  requiresDepartmentCheck.createResolver(
    async (_parent, args, { models, token }) => {
      try {
        const {
          user: { unitid: holder, company }
        } = await decode(token);

        if (args.departmentid) {
          await checkCompanyMembership(
            models,
            company,
            args.departmentid,
            "department"
          );
        }

        if (args.teamid && args.teamid != "new") {
          await checkCompanyMembership(models, company, args.teamid, "team");
        }

        if (args.userid && args.userid != "new") {
          await checkCompanyMembership(models, company, args.userid, "user");

          if (args.userid == holder) {
            return;
          }
        }

        if (args.user && args.user.id && args.user.id != "new") {
          await checkCompanyMembership(models, company, args.user.id, "user");

          if (args.user.id == holder) {
            return;
          }
        }

        if (args.employeeid && args.employeeid != "new") {
          await checkCompanyMembership(
            models,
            company,
            args.employeeid,
            "user"
          );
        }

        if (args.unitid && args.unitid != "new") {
          await checkCompanyMembership(models, company, args.unitid, "user");

          if (args.unitid == holder) {
            return;
          }
        }

        if (args.userids) {
          await Promise.all(
            args.userids
              .filter(id => id != "new")
              .map(id => checkCompanyMembership(models, company, id, "user"))
          );
        }

        if (args.unitids) {
          await Promise.all(
            args.unitids
              .filter(id => id != "new")
              .map(id => checkCompanyMembership(models, company, id, "user"))
          );
        }

        if (typeof rights[0] == "string") {
          const hasRight = await models.Right.findOne({
            where: models.sequelize.and(
              { holder },
              { forunit: { [models.Op.or]: [company, null] } },
              models.sequelize.or(
                { type: { [models.Op.and]: rights } },
                { type: "admin" }
              )
            )
          });

          if (!hasRight) {
            throw new RightsError();
          }
        } else {
          let hasRight = null;

          for await (const right of rights[0]) {
            hasRight = await models.Right.findOne({
              where: models.sequelize.and(
                { holder },
                { forunit: { [models.Op.or]: [company, null] } },
                models.sequelize.or(
                  { type: { [models.Op.and]: right } },
                  { type: "admin" }
                )
              )
            });
          }

          if (!hasRight) {
            throw new RightsError();
          }
        }
      } catch (err) {
        if (err instanceof RightsError) {
          throw err;
        }
        throw new AuthError({
          message:
            "Opps, something went wrong. Please report this error with id auth_1"
        });
      }
    }
  );

export const requiresMessageGroupRights = rights =>
  requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = await decode(token);

      const hasRights = await checkRights(models, rights, unitid, args);
      if (!hasRights) {
        throw new RightsError("User doesn't have the neccesary rights");
      }
    } catch (err) {
      if (err instanceof RightsError) {
        throw err;
      }
      throw new AuthError({
        message:
          "Oops, something went wrong. Please report this error with id auth_2"
      });
    }
  });

export const requiresVipfyAdmin = requiresAuth.createResolver(
  async (parent, args, { token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);

      if (unitid != 7 && unitid != 22 && unitid != 67) {
        throw new AdminError();
      }
    } catch (err) {
      throw new AdminError();
    }
  }
);

export const requiresMachineToken = createResolver(
  async (parent, args, { token }) => {
    try {
      const { cronjob } = decode(token);

      if (!cronjob) {
        throw new Error("Only possible by cronjob");
      }
    } catch (err) {
      throw new Error(err);
    }
  }
);
