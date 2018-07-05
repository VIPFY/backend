import { requiresRight } from "../../helpers/permissions";

export default {
  fetchUnitApps: requiresRight(["distributelicences", "admin"]).createResolver(
    async (parent, { departmentid }, { models }) => {
      try {
        const userApps = await models.sequelize
          .query(
            "SELECT DISTINCT bp.usedby, bp.id AS boughtplan, bp.description, " +
              "a.name AS appname, p.appid, a.logo AS applogo FROM right_data AS r " +
              "INNER JOIN boughtplan_data bp ON (r.forunit = bp.usedby AND " +
              "r.type = 'canuselicences' AND r.holder = :departmentid) " +
              "OR bp.usedby = :departmentid INNER JOIN plan_data p " +
              "on bp.planid = p.id INNER JOIN app_data a on p.appid = a.id ",
            { replacements: { departmentid } }
          )
          .spread(res => res);

        return userApps;
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  )
};
