/*
* This file contains a Higher Order Component which can be used to create
* Authentication logic. The base function lets you stack several permissions,
* they just have to wrapped around the component which shall be protected.
*/

import { decode } from "jsonwebtoken";

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
export const requiresAuth = createResolver(async (parent, args, { models, token }) => {
  if (!token) throw new Error("Not authenticated!");
  try {
    const {
      user: { company, unitid }
    } = decode(token);
    const userExists = await models.Unit.findById(unitid);
    if (!userExists) throw new Error("Couldn't find user in database!");

    if (company) {
      const companyExists = await models.Unit.findById(company);
      if (!companyExists) throw new Error("Couldn't find company in database!");
    }
  } catch (err) {
    throw new Error(err.message);
  }
});

export const requiresRight = rights =>
  requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid: holder, company }
      } = await decode(token);

      const hasRight = await models.Right.findOne({
        where: {
          holder,
          forunit: { [models.Op.or]: [company, null] },
          type: { [models.Op.or]: rights }
        }
      });

      if (!hasRight) throw new Error("You don't have the necessary rights!");
    } catch (err) {
      throw new Error("Opps, something went wrong. Please report this error with id auth_1");
    }
  });

export const requiresVipfyAdmin = requiresAuth.createResolver(async (parent, args, { token }) => {
  try {
    const {
      user: { unitid }
    } = decode(token);

    if (unitid != 7 && unitid != 22 && unitid != 67) {
      throw new Error("You're not a Vipfy Admin");
    }
  } catch (err) {
    throw new Error("You're not a Vipfy Admin!");
  }
});
