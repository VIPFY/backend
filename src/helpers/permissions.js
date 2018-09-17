/*
* This file contains a Higher Order Component which can be used to create
* Authentication logic. The base function lets you stack several permissions,
* they just have to wrapped around the component which shall be protected.
*/

import { decode } from "jsonwebtoken";
import { checkRights } from "@vipfy-private/messaging";
import { checkCompanyMembership } from "./companyMembership";
import { AuthError, AdminError } from "../errors";

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
export const requiresAuth = createResolver(async (parent, args, { token }) => {
  if (!token || token == "null") throw new AuthError();
  // all other cases handled by auth middleware
});

export const requiresDepartmentCheck = requiresAuth.createResolver(
  async (parent, args, { models, token }) => {
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
    async (parent, args, { models, token }) => {
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

        if (args.userid) {
          await checkCompanyMembership(models, company, args.userid, "user");
        }

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
          throw new AuthError({
            message: "You don't have the necessary rights!"
          });
        }
      } catch (err) {
        if (err instanceof AuthError) {
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
        throw new Error("User doesn't have the neccesary rights");
      }
    } catch (err) {
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
