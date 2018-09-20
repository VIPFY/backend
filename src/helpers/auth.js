import jwt from "jsonwebtoken";
import { pick } from "lodash";
import { AuthError } from "../errors";
import {
  getCompanyMembershipCacheStats,
  flushCompanyMembershipCache
} from "./companyMembership";

export const createTokens = async (user, SECRET, SECRET_TWO) => {
  try {
    const createToken = await jwt.sign(
      { user: pick(user, ["unitid", "company"]) },
      SECRET,
      {
        expiresIn: "12h"
      }
    );

    const createRefreshToken = await jwt.sign(
      { user: pick(user, ["unitid", "company"]) },
      SECRET_TWO,
      {
        expiresIn: "7d"
      }
    );

    return [createToken, createRefreshToken];
  } catch (err) {
    throw new Error(err.message);
  }
};

export const refreshTokens = async (
  refreshToken,
  models,
  SECRET,
  SECRET_TWO
) => {
  try {
    const {
      user: { unitid }
    } = await jwt.decode(refreshToken);

    if (!unitid) {
      throw new Error("Token has no valid User!");
    }

    const user = await models.Login.findOne({
      where: { unitid },
      raw: true
    });

    if (!user) {
      throw new Error("User not found!");
    }

    const refreshSecret = user.passwordhash + SECRET_TWO;
    await jwt.verify(refreshToken, refreshSecret);

    const [newToken, newRefreshToken] = await createTokens(
      user,
      SECRET,
      refreshSecret
    );
    return {
      token: newToken,
      refreshToken: newRefreshToken
    };
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
};

const NodeCache = require("node-cache");

const unitAuthCache = new NodeCache({
  checkperiod: 120,
  stdTTL: 60,
  deleteOnExpire: true
});

const getAuthentificationObject = async (models, unitid) => {
  try {
    let permissions = unitAuthCache.get(unitid);
    if (permissions != undefined) return permissions;
    const unit = await models.Unit.findOne(
      { where: { id: unitid } },
      { raw: true }
    );
    permissions = {
      suspended: unit.suspended,
      banned: unit.banned,
      deleted: unit.banned
    };
    unitAuthCache.set(unitid, permissions);
    return permissions;
  } catch (err) {
    throw new AuthError(err);
  }
};

const checkAuthentificationObject = (permissions, name) => {
  if (permissions.suspended) {
    throw new AuthError({ message: `${name} is suspended!` });
  }
  if (permissions.banned) {
    throw new AuthError({ message: `${name} is banned!` });
  }
  if (permissions.deleted) {
    throw new AuthError({ message: `${name} is deleted!` });
  }
};

export const checkAuthentification = async (models, unitid, company) => {
  if (unitid === undefined || unitid === null || unitid === "null") {
    throw new AuthError();
  }

  if (company === undefined || company === null || company === "null") {
    company = unitid; // a bit of a hack to make the code simpler
  }

  const [userPerm, companyPerm] = await Promise.all([
    getAuthentificationObject(models, unitid),
    getAuthentificationObject(models, company)
  ]);

  checkAuthentificationObject(userPerm, "User");
  checkAuthentificationObject(companyPerm, "Company");
};

export const getAuthStats = () => ({
  unitAuthCache: unitAuthCache.getStats(),
  companyMembershipCache: getCompanyMembershipCacheStats()
});

export const flushAuthCaches = () => {
  unitAuthCache.flushAll();
  flushCompanyMembershipCache();
};
