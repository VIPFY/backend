import jwt from "jsonwebtoken";
import { pick } from "lodash";
import { parentAdminCheck } from "./functions";
import { AuthError } from "../errors";
import { getCompanyMembershipCacheStats } from "./companyMembership";

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
  let userId = 0;

  try {
    const {
      user: { unitid }
    } = await jwt.decode(refreshToken);
    userId = unitid;

    if (!userId) {
      return {};
    }

    const p1 = await models.Human.findOne({
      where: { unitid: userId },
      raw: true
    });
    const p2 = await models.User.findOne({ where: { id: userId }, raw: true });
    const [user, basicUser] = await Promise.all([p1, p2]);

    if (!user) {
      return {};
    }

    const refreshSecret = user.passwordhash + SECRET_TWO;

    await jwt.verify(refreshToken, refreshSecret);

    const refreshUser = await parentAdminCheck(basicUser);

    const [newToken, newRefreshToken] = await createTokens(
      refreshUser,
      SECRET,
      refreshSecret
    );
    return {
      token: newToken,
      refreshToken: newRefreshToken,
      refreshUser
    };
  } catch (err) {
    console.log(err);
    return {};
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
  companyMembershipCache: getCompanyMembershipCacheStats
});
