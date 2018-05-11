/*
This file contains a Higher Order Component which can be used to create
Authentication logic. The base function lets you stack several permissions,
they just have to wrapped around the component which shall be protected.
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
    const { user: { company, unitid } } = decode(token);

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

// These functions can be nested. Here it checks first whether an user
// is authenticated and then if he has admin status.
export const requiresAdmin = requiresAuth.createResolver(
  async (parent, args, { models, token }) => {
    try {
      const { user: { unitid } } = await decode(token);
      const rights = await models.Right.findOne({ where: { holder: unitid } });
      if (!rights.type || rights.type.toLowerCase() != "admin") {
        throw new Error("You're not an Admin!");
      }
    } catch (err) {
      throw new Error("You're not an Admin!");
    }
  }
);
