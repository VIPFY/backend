import { AuthError } from "../errors";

const NodeCache = require("node-cache");

const companyMembershipCache = new NodeCache({
  checkperiod: 300,
  stdTTL: 300,
  deleteOnExpire: true
});

/*
* Check whether the department/user belongs to the company
* Don't use to test for department membership as that data could be out of date
*/
export const checkCompanyMembership = async (
  models,
  company,
  entityid,
  entityname = "Entity"
) => {
  // sanity check
  if (`${company}`.indexOf("-") !== -1) {
    throw new Error("company must be a number");
  }
  const cacheKey = `${company}-${entityid}`;
  const cacheItem = companyMembershipCache.get(cacheKey);
  if (cacheItem !== undefined) {
    // found in cache

    if (cacheItem === false) {
      throw new AuthError(
        `This ${entityname} doesn't belong to the user's company!`
      );
    } else if (cacheItem === true) {
      return true;
    } else {
      throw new Error("cache error");
    }
  }

  const departments = await models.sequelize.query(
    "SELECT childid FROM department_tree_view WHERE id = :company AND childid = :child AND level > 1 LIMIT 1",
    {
      replacements: { company, child: entityid },
      raw: true
    }
  );

  const inDepartment = departments.length > 0;

  companyMembershipCache.set(cacheKey, inDepartment);

  if (!inDepartment) {
    throw new AuthError(
      `This ${entityname} doesn't belong to the user's company!`
    );
  }

  return true;
};

export const resetCompanyMembershipCache = async (company, entityid) => {
  // sanity check
  if (`${company}`.indexOf("-") !== -1) {
    throw new Error("company must be a number");
  }
  const cacheKey = `${company}-${entityid}`;
  companyMembershipCache.del(cacheKey);
};

export const getCompanyMembershipCacheStats = () =>
  companyMembershipCache.getStats();

export const flushCompanyMembershipCache = () =>
  companyMembershipCache.flushAll();
