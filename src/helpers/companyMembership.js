import { RightsError } from "../errors";

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
  entityID,
  entityName = "Entity"
) => {
  if (entityID == company) {
    return true;
  }

  if (entityName == "user") {
    const user = await models.User.findOne({
      where: { id: entityID },
      raw: true
    });

    if (!user) {
      throw new RightsError({
        message: "The provided id does not belong to an user!"
      });
    }
  }

  const cacheKey = `${company}-${entityID}`;
  const cacheItem = companyMembershipCache.get(cacheKey);
  if (cacheItem !== undefined) {
    // found in cache

    if (cacheItem === false) {
      throw new RightsError({
        message: `This ${entityName} doesn't belong to the user's company!`
      });
    } else if (cacheItem === true) {
      return true;
    } else {
      throw new Error("cache error");
    }
  }

  const p1 = models.Unit.findOne({ where: { id: entityID }, raw: true });

  const p2 = models.sequelize.query(
    "SELECT childid FROM department_tree_view WHERE id = :company AND childid = :child AND level > 1 LIMIT 1",
    {
      replacements: { company, child: entityID },
      type: models.sequelize.QueryTypes.SELECT,
      raw: true
    }
  );

  const [valid, departments] = await Promise.all([p1, p2]);

  if (!valid || valid.deleted || valid.suspended || valid.banned) {
    throw new RightsError({
      message: "You can only edit valid units!"
    });
  }

  const inDepartment = departments.length > 0;
  companyMembershipCache.set(cacheKey, inDepartment);

  if (!inDepartment) {
    throw new RightsError({
      message: `This ${entityName} doesn't belong to the user's company!`
    });
  }

  return true;
};

export const checkLicenceValidilty = async (models, company, licenceid) => {
  const account = await models.sequelize.query(
    `
    SELECT l.id
      FROM boughtplan_view bd
          JOIN licence_data l on l.boughtplanid = bd.id
      WHERE (bd.endtime IS NULL OR bd.endtime > NOW())
        AND (l.endtime IS NULL OR l.endtime > NOW())
        AND bd.usedby = :company
        AND l.id = :licenceid
        AND l.disabled = false AND bd.disabled = false`,
    {
      replacements: { company, licenceid },
      type: models.sequelize.QueryTypes.SELECT
    }
  );

  if (account.length != 1) {
    throw new RightsError({
      message: "Account is disabled, terminated or outside company."
    });
  }
};

export const checkLicenceMembership = async (models, company, licenceid) => {
  const account = await models.sequelize.query(
    `
    SELECT l.id
      FROM boughtplan_view bd
          JOIN licence_data l on l.boughtplanid = bd.id
      WHERE bd.usedby = :company
        AND l.id = :licenceid`,
    {
      replacements: { company, licenceid },
      type: models.sequelize.QueryTypes.SELECT
    }
  );

  if (account.length != 1) {
    throw new RightsError({
      message: "Account doesn't belong to the user's company!"
    });
  }
};

export const checkOrbitMembership = async (models, company, orbitid) => {
  const orbit = await models.sequelize.query(
    `
    SELECT id
      FROM boughtplan_view 
      WHERE usedby = :company
        AND id = :orbitid`,
    {
      replacements: { company, orbitid },
      type: models.sequelize.QueryTypes.SELECT
    }
  );

  if (orbit.length != 1) {
    throw new RightsError({
      message: "Orbit doesn't belong to the user's company!"
    });
  }
};

export const resetCompanyMembershipCache = async (company, entityID) => {
  // sanity check
  if (`${company}`.indexOf("-") !== -1) {
    throw new Error("company must be a number");
  }
  const cacheKey = `${company}-${entityID}`;
  companyMembershipCache.del(cacheKey);
};

export const getCompanyMembershipCacheStats = () =>
  companyMembershipCache.getStats();

export const flushCompanyMembershipCache = () =>
  companyMembershipCache.flushAll();
