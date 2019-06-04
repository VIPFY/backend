import jwt from "jsonwebtoken";
import { pick } from "lodash";
import bcrypt from "bcrypt";
import models from "@vipfy-private/sequelize-setup";
import { AuthError } from "../errors";
import {
  getCompanyMembershipCacheStats,
  flushCompanyMembershipCache
} from "./companyMembership";
import { computePasswordScore } from "./functions";

export const createToken = async (user, SECRET, expiresIn = "1w") => {
  try {
    const newToken = await jwt.sign(
      { user: pick(user, ["unitid", "company"]) },
      SECRET,
      { expiresIn }
    );

    return newToken;
  } catch (err) {
    throw new Error(err.message);
  }
};

const NodeCache = require("node-cache");

const unitAuthCache = new NodeCache({
  checkperiod: 120,
  stdTTL: 60,
  deleteOnExpire: true
});

const getAuthentificationObject = async unitid => {
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

export const checkAuthentification = async (unitid, company) => {
  if (unitid === undefined || unitid === null || unitid === "null") {
    throw new AuthError();
  }

  if (company === undefined || company === null || company === "null") {
    company = unitid; // a bit of a hack to make the code simpler
  }

  const [userPerm, companyPerm] = await Promise.all([
    getAuthentificationObject(unitid),
    getAuthentificationObject(company)
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

export const getNewPasswordData = async password => {
  const passwordhash = await bcrypt.hash(password, 12);
  const passwordstrength = computePasswordScore(password);
  const passwordlength = password.length;
  return { passwordhash, passwordstrength, passwordlength };
};
