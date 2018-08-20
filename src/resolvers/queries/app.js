import { decode } from "jsonwebtoken";
import { weeblyApi } from "../../services/weebly";
import dd24Api from "../../services/dd24";
import { requiresAuth, requiresRight } from "../../helpers/permissions";

/* eslint-disable default-case */
const startTime = Date.now();

export default {
  allApps: async (parent, { limit, offset, sortOptions }, { models }) => {
    try {
      const allApps = await models.AppDetails.findAll({
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
      });

      return allApps;
    } catch (err) {
      throw new Error(err.message);
    }
  },

  fetchApp: (parent, { name }, { models }) => models.AppDetails.findOne({ where: { name } }),
  fetchAppById: (parent, { id }, { models }) => models.AppDetails.findById(id),

  fetchLicences: requiresAuth.createResolver(
    async (parent, { licenceid }, { models, token }, info) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        let query = `SELECT licence_data.*, plan_data.appid FROM licence_data JOIN
           boughtplan_data ON licence_data.boughtplanid = boughtplan_data.id
           JOIN plan_data ON boughtplan_data.planid = plan_data.id
           WHERE licence_data.unitid = :unitid`;

        const replacements = { unitid };

        if (licenceid) {
          query += " AND licence_data.id = :licenceid";
          replacements.licenceid = licenceid;
        }
        const licences = await models.sequelize.query(query, { replacements }).spread(res => res);

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

            if (licence.appid == 11) {
              const domain = await models.sequelize.query(
                `SELECT ld.id, ld.key FROM licence_data ld INNER JOIN
                  boughtplan_data bpd on ld.boughtplanid = bpd.id WHERE
                  bpd.planid IN (25, 48, 49, 50, 51, 52, 53) AND ld.unitid = :unitid LIMIT 1;`,
                { replacements: { unitid }, type: models.sequelize.QueryTypes.SELECT }
              );

              const accountData = await dd24Api("GetOneTimePassword", { cid: domain[0].key.cid });
              if (accountData.code == 200) {
                if (licence.key.cid != accountData.cid) {
                  throw new Error("Accountdata doesn't match!");
                }

                licence.key.loginurl = accountData.loginuri;
                licence.key.password = accountData.onetimepassword;
              } else {
                throw new Error(accountData.description);
              }
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

  fetchUsersOwnLicences: async (parent, { unitid }, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);

      const departments = await models.sequelize.query("Select id from getDepartments(:company)", {
        replacements: { company },
        type: models.sequelize.QueryTypes.SELECT
      });

      const departmentIds = Object.values(departments).map(dp => dp.id);

      const departmentPlans = await models.DepartmentApp.findAll({
        where: {
          departmentid: departmentIds
        },
        raw: true
      });

      const departmentPlanIds = Object.values(departmentPlans).map(dp => dp.boughtplanid);

      const boughtPlans = await models.BoughtPlan.findAll({
        attributes: ["id"],
        where: { id: { [models.Op.notIn]: departmentPlanIds } },
        raw: true
      });

      const bpIds = Object.values(boughtPlans).map(bp => bp.id);

      const licences = await models.Licence.findAll({
        where: { unitid, boughtplanid: bpIds }
      });

      // eslint-disable-next-line
      const filteredLicences = licences.map(licence => {
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
      });

      return filteredLicences;
    } catch (err) {
      throw new Error(err.message);
    }
  },

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
            `SELECT DISTINCT bp.usedby, bp.id AS boughtplan, bp.description,
              a.name AS appname, p.appid, a.icon AS appicon, a.logo AS applogo
              FROM right_data AS r INNER JOIN boughtplan_data bp ON (r.forunit =
              bp.usedby AND r.type = 'canuselicences' AND r.holder = :departmentid)
              OR bp.usedby = :departmentid INNER JOIN plan_data p
              on bp.planid = p.id INNER JOIN app_data a on p.appid = a.id`,
            { replacements: { departmentid } }
          )
          .spread(res => res);

        const sanitizedApps = [];
        userApps.forEach(app => {
          if (sanitizedApps.find(item => item.appid == app.appid) == undefined) {
            sanitizedApps.push(app);
          }
        });

        return sanitizedApps;
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  fetchDomains: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);

      const domains = await models.sequelize
        .query(
          `SELECT ld.*, ld.endtime::date, ld.starttime::date FROM licence_data ld
           INNER JOIN boughtplan_data bpd on ld.boughtplanid = bpd.id WHERE
           bpd.planid IN (25, 48, 51, 50, 49) AND ld.unitid = :unitid;`,
          { replacements: { unitid } }
        )
        .spread(res => res);

      return domains;
    } catch (err) {
      throw new Error(err);
    }
  })
};
