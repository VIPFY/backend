/*
 * This file contains a Higher Order Component which can be used to create
 * Authentication logic. The base function lets you stack several permissions,
 * they just have to wrapped around the component which shall be protected.
 */

import { decode, verify } from "jsonwebtoken";
import { checkRights } from "@vipfy-private/messaging";
import {
  checkCompanyMembership,
  checkLicenceMembership,
  checkOrbitMembership,
} from "./companyMembership";
import { AuthError, AdminError, RightsError, NormalError } from "../errors";
import { VIPFY_MANAGEMENT } from "../constants";

/**
 * Recursively wraps a function with passed functions
 *
 * @param {function} resolver The function which will be wrapped
 */
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

export const requiresSecondaryAuth = requiredRights =>
  createResolver(
    async (_parent, _args, { SECRET_TWO, secondaryAuthToken }, info) => {
      try {
        if (!SECRET_TWO) {
          throw new Error("server misconfigured, no secret set");
        }
        if (!secondaryAuthToken) {
          throw new Error("secondary auth required but not present");
        }
        const { rights } = verify(secondaryAuthToken, SECRET_TWO);
        for (const right in requiredRights) {
          if (!rights.includes(right)) {
            return false;
          }
        }
        return true;
      } catch (error) {
        throw new AuthError(error.message);
      }
    }
  );

/**
 * Checks whether the user is authenticated
 */
export const requiresAuth = createResolver(
  async (_parent, _args, { models, session, SECRET }, info) => {
    try {
      if (!session || !session.token) {
        throw new Error("No valid token received!");
      }

      const {
        user: { unitid },
      } = verify(session.token, SECRET);

      const valid = await models.User.findOne({
        where: { id: unitid },
        raw: true,
      });

      if (
        !valid ||
        valid.deleted ||
        valid.companyban ||
        valid.suspended ||
        valid.banned
      ) {
        throw new Error("Login is currently not possible for you!");
      }

      return "authenticated!";
    } catch (error) {
      session.destroy(err => {
        if (err) {
          console.error(err);
        }
      });

      if (info.fieldName == "signOut") {
        throw new NormalError({
          message: error.message,
          internalData: { error },
        });
      } else {
        throw new AuthError(error.message);
      }
    }
  }
  // all other cases handled by auth middleware
);

export const requiresRights = rights =>
  requiresAuth.createResolver(async (_parent, args, { models, session }) => {
    try {
      const {
        user: { unitid: holder, company },
      } = await decode(session.token);

      // Seems redundant @Jannis Froese
      if (args.departmentid) {
        await checkCompanyMembership(
          models,
          company,
          args.departmentid,
          "department"
        );
      }

      if (args.licenceid) {
        await checkLicenceMembership(models, company, args.licenceid);
      }

      if (args.orbitid) {
        await checkOrbitMembership(models, company, args.orbitid);
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
        await checkCompanyMembership(models, company, args.employeeid, "user");
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

      const rightsCheck = {};
      let index = 0;

      rights.forEach((_r, i) => {
        rightsCheck[i] = true;
      });

      for await (const right of rights) {
        if (typeof right == "string") {
          if (
            right == "myself" &&
            ((args.userid && args.userid == holder) ||
              (args.employeeid && args.employeeid == holder) ||
              (args.user && args.user.id && args.user.id == holder) ||
              (!args.user && !args.userid && !args.employeeid))
          ) {
            break;
          }

          if (right == "myself" && args.assignmentid) {
            const r = await models.sequelize.LicenceRight.findOne({
              where: {
                unitid: holder,
                id: args.assignmentid,
                endtime: { [models.Op.lt]: models.sequelize.fn("NOW") },
              },
            });
            if (r) {
              break;
            }
          }

          const hasRight = await models.Right.findOne({
            where: models.sequelize.and(
              { holder },
              { forunit: { [models.Op.or]: [company, null] } },
              models.sequelize.or({ type: right }, { type: "admin" })
            ),
          });

          if (hasRight) {
            break;
          } else {
            rightsCheck[index] = false;
          }
        } else {
          for await (const subRight of right) {
            const hasRight = await models.Right.findOne({
              where: models.sequelize.and(
                { holder },
                { forunit: { [models.Op.or]: [company, null] } },
                models.sequelize.or({ type: subRight }, { type: "admin" })
              ),
            });

            if (!hasRight) {
              rightsCheck[index] = false;
              break;
            }
          }
        }
        index++;
      }

      const okay = Object.values(rightsCheck).some(val => val === true);
      if (!okay) {
        throw new RightsError();
      }
    } catch (err) {
      if (err instanceof RightsError) {
        console.error(err);
        throw err;
      } else {
        console.error(err);
        session.destroy(error => {
          if (error) {
            console.error(error);
          }
        });
        throw new AuthError({
          message:
            "Opps, something went wrong. Please report this error with id auth_1",
        });
      }
    }
  });

export const requiresMessageGroupRights = rights =>
  requiresAuth.createResolver(async (_p, args, { models, session }) => {
    try {
      const {
        user: { unitid },
      } = await decode(session.token);

      const hasRights = await checkRights(models, rights, unitid, args);
      if (!hasRights) {
        throw new RightsError("User doesn't have the neccesary rights");
      }
    } catch (err) {
      if (err instanceof RightsError) {
        throw err;
      } else {
        session.destroy(error => {
          if (error) {
            console.error(error);
          }
        });
        throw new AuthError({
          message:
            "Oops, something went wrong. Please report this error with id auth_2",
        });
      }
    }
  });

export const requiresVipfyManagement = myself =>
  requiresAuth.createResolver(
    async (_parent, { userid }, { models, session }) => {
      try {
        const {
          user: { unitid, company },
        } = decode(session.token);

        if (!VIPFY_MANAGEMENT.find(id => id == unitid)) {
          if (userid && myself) {
            await checkCompanyMembership(models, company, userid, "user");
          } else {
            throw new AdminError();
          }
        }
      } catch (err) {
        throw new AdminError();
      }
    }
  );

export const requiresVipfyAdmin = myself =>
  requiresAuth.createResolver(
    async (_parent, { userid }, { models, session }) => {
      try {
        const {
          user: { unitid, company },
        } = decode(session.token);

        const vipfyAdmins = [
          ...VIPFY_MANAGEMENT,
          "b65a0528-59b1-4137-887f-faf3d6a07fd7", // Lisa
          "84c3382a-63c1-479f-85cd-d16e9988aa8a", // Eva
          "f64c1f89-66d7-4338-930c-8e2a731bb644", // Janet
          "e72a945f-b29d-445b-ab68-d75d1070bdb6", // Conrad
          "ef08cbb6-d53c-4d0f-aa70-10a9df0b84d9", // Eva Kiszka's other account
        ];

        if (!vipfyAdmins.find(id => id == unitid)) {
          if (userid && myself) {
            await checkCompanyMembership(models, company, userid, "user");
          } else {
            throw new AdminError();
          }
        }
      } catch (err) {
        throw new AdminError();
      }
    }
  );

export const requiresMachineToken = createResolver(
  async (_parent, _args, { token }) => {
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
