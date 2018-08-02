/*
* This file contains a Higher Order Component which can be used to create
* Authentication logic. The base function lets you stack several permissions,
* they just have to wrapped around the component which shall be protected.
*/

import { decode } from "jsonwebtoken";
import { checkDepartment } from "./functions";

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

export const requiresDepartmentCheck = requiresAuth.createResolver(
  async (parent, args, { models, token }) => {
    try {
      if (args.departmentid) {
        const {
          user: { company }
        } = decode(token);

        await checkDepartment(models, company, args.departmentid);
      }
    } catch (err) {
      throw new Error(err);
    }
  }
);

export const requiresRight = rights =>
  requiresDepartmentCheck.createResolver(async (parent, args, { models, token }) => {
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

export const requiresMessageGroupRights = rights =>
  requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = await decode(token);

      let groupid;
      if ("group" in args) {
        groupid = args.group;
      } else if ("groupid" in args) {
        groupid = args.groupid;
      } else if ("message" in args) {
        const message = await models.MessageData.findById(args.message, { raw: true });
        console.log("MESSAGErights", message);
        groupid = message.receiver;
      } else {
        throw new Error("Can't find group to check permission against");
      }

      const hasRights = await models.MessageGroupRight.findAll({
        where: {
          right: rights,
          unitid,
          groupid
        },
        raw: true
      });

      if (hasRights.length !== rights.length) {
        throw new Error("You don't have the necessary rights!");
      }
    } catch (err) {
      console.log(err.message);
      throw new Error("Oops, something went wrong. Please report this error with id auth_2");
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
