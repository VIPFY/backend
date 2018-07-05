import { decode } from "jsonwebtoken";
import { weeblyApi } from "../../services/weebly";
import { requiresAuth, requiresRight } from "../../helpers/permissions";

/* eslint-disable default-case */

export default {
  allApps: (parent, { limit, offset, sortOptions }, { models }) =>
    models.AppDetails.findAll({
      limit,
      offset,
      attributes: [
        "id",
        "icon",
        "logo",
        "disabled",
        "name",
        "teaserdescription",
        "features",
        "cheapestprice",
        "avgstars",
        "cheapestpromo"
      ],
      order: sortOptions ? [[sortOptions.name, sortOptions.order]] : ""
    }),

  fetchApp: (parent, { name }, { models }) => models.AppDetails.findOne({ where: { name } }),
  fetchAppById: (parent, { id }, { models }) => models.AppDetails.findById(id),

  fetchLicences: requiresAuth.createResolver(
    async (parent, { licenceid }, { models, token }, info) => {
      const startTime = Date.now();
      try {
        const {
          user: { unitid }
        } = decode(token);
        let licences;

        let query =
          "SELECT licence_data.*, plan_data.appid FROM licence_data JOIN" +
          " boughtplan_data ON licence_data.boughtplanid = boughtplan_data.id" +
          " JOIN plan_data ON boughtplan_data.planid = plan_data.id" +
          " WHERE licence_data.unitid = ?";

        if (licenceid) {
          query += " AND licence_data.id = ?";

          licences = await models.sequelize
            .query(query, { replacements: [unitid, licenceid] })
            .spread(res => res);
        } else {
          licences = await models.sequelize
            .query(query, { replacements: [unitid] })
            .spread(res => res);
        }

        if (
          info.fieldNodes[0].selectionSet.selections.find(item => item.name.value == "key") !==
          undefined
        ) {
          const createLoginLinks = licences.map(async licence => {
            if (licence.unitid != unitid) {
              throw new Error("This licence doesn't belong to this user!");
            }

            if (licence.disabled) {
              licence.agreed = false;
              licence.key = null;
            }

            if (Date.parse(licence.starttime) > startTime || !licence.agreed) {
              licence.key = null;
            }

            if (licence.endtime) {
              if (Date.parse(licence.endtime) < startTime) {
                licence.key = null;
              }
            }

            if (licence.appid == 2) {
              const endpoint = `user/${licence.key.weeblyid}/loginLink`;
              const res = await weeblyApi("POST", endpoint, "");
              licence.key.loginlink = res.link;
            }
          });

          await Promise.all(createLoginLinks);
        }

        return licences;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  // change to requiresRight("A") in Production!
  createLoginLink: requiresAuth.createResolver(async (parent, { licenceid }, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);
      let res;

      const licenceBelongsToUser = await models.Licence.findOne({
        where: { unitid, id: licenceid }
      });

      if (!licenceBelongsToUser) {
        throw new Error("This licence doesn't belong to this user!");
      }

      const credentials = licenceBelongsToUser.get("key");

      if (credentials.weeblyid) {
        const endpoint = `user/${credentials.weeblyid}/loginLink`;
        res = await weeblyApi("POST", endpoint, "");
      }

      return {
        ok: true,
        loginLink: res.link
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  fetchUnitApps: requiresRight(["distributelicences", "admin"]).createResolver(
    async (parent, { departmentid }, { models }) => {
      try {
        const userApps = await models.sequelize
          .query(
            "SELECT DISTINCT bp.usedby, bp.id AS boughtplan, bp.description, " +
              "a.name AS appname, p.appid, a.icon AS appicon, a.logo AS applogo " +
              "FROM right_data AS r INNER JOIN boughtplan_data bp ON (r.forunit = bp.usedby AND " +
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
