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
        user: { company, unitid },
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

      const vipfyPlans = await models.Plan.findAll({
        where: {
          appid: "aeb28408-464f-49f7-97f1-6a512ccf46c2",
          enddate: {
            [models.Op.or]: {
              [models.Op.is]: null,
              [models.Op.lt]: models.sequelize.fn("NOW"),
            },
          },
        },
        attributes: ["id", "price"],
        raw: true,
      });

      const usersVIPFYplans = await models.BoughtPlanView.findAll({
        where: {
          payer: company,
          planid: vipfyPlans.map(plan => plan.id),
        },
        order: [["endtime", "DESC"]],
        raw: true,
      });

      const currentPlan = usersVIPFYplans.find(plan => {
        if (plan.disabled) {
          return false;
        } else if (!plan.endtime) {
          return true;
        } else {
          return plan.endtime > Date.now();
        }
      });

      if (!currentPlan) {
        await models.sequelize.transaction(async ta => {
          const vipfyPlan = await models.BoughtPlan.create(
            {
              usedby: company,
              alias: "VIPFY Basic",
              disabled: false,
              key: { needsCustomerAction: true },
            },
            { transaction: ta }
          );

          const vipfyFreePlan = vipfyPlans.find(plan => plan.price == 0);

          await models.BoughtPlanPeriod.create(
            {
              boughtplanid: vipfyPlan.id,
              planid: vipfyFreePlan.id,
              payer: company,
              creator: unitid,
              totalprice: 0,
            },
            { transaction: ta }
          );
        });
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

        const vipfyAdmins = [...VIPFY_MANAGEMENT];

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
