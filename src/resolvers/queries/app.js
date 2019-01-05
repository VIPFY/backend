import { decode, sign } from "jsonwebtoken";
import uuid from "uuid";
// import { getLoginData } from "@vipfy-private/weebly";
import * as Services from "@vipfy-private/services";
import dd24Api from "../../services/dd24";
import { NormalError, PartnerError } from "../../errors";
import { requiresAuth, requiresRights } from "../../helpers/permissions";

import logger from "../../loggers";

export default {
  allApps: requiresRights(["view-apps"]).createResolver(
    async (parent, { limit, offset, sortOptions }, { models }) => {
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
            "cheapestpromo",
            "needssubdomain",
            "options"
          ],
          where: { disabled: false, deprecated: false, hidden: false },
          order: sortOptions ? [[sortOptions.name, sortOptions.order]] : ""
        });

        return allApps;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchAllAppsEnhanced: requiresRights([
    "view-apps",
    "view-licences"
  ]).createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);

      const data = models.sequelize.query(
        `SELECT app_data.*,
            bool_or(:company in (SELECT payer FROM boughtplan_data WHERE planid = d2.id)) as hasboughtplan
          FROM app_data
               inner join plan_data d2 on app_data.id = d2.appid
          GROUP BY app_data.id
        `,
        {
          replacements: { company },
          type: models.sequelize.QueryTypes.SELECT
        }
      );

      return data;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  fetchAppById: requiresRights(["view-apps"]).createResolver(
    async (parent, { id }, { models }) => {
      try {
        const app = await models.AppDetails.findOne({
          where: { id, disabled: false, deprecated: false }
        });

        return app;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchLicences: requiresAuth.createResolver(
    async (parent, { licenceid }, { models, token }, info) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        let query = `SELECT licence_data.*, plan_data.appid FROM licence_data JOIN
           boughtplan_data ON licence_data.boughtplanid = boughtplan_data.id
           JOIN plan_data ON boughtplan_data.planid = plan_data.id
           JOIN app_data ON plan_data.appid = app_data.id
           WHERE licence_data.unitid = :unitid AND not app_data.disabled`;

        const replacements = { unitid };

        if (licenceid) {
          query += " AND licence_data.id = :licenceid";
          replacements.licenceid = licenceid;
        }

        const licences = await models.sequelize
          .query(query, { replacements })
          .spread(res => res);

        const startTime = Date.now();

        if (
          info.fieldNodes[0].selectionSet.selections.find(
            item => item.name.value == "key"
          ) !== undefined
        ) {
          const createLoginLinks = licences.map(async licence => {
            if (licence.unitid != unitid) {
              throw new NormalError({
                message: "This licence doesn't belong to this user!"
              });
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

            if (licence.appid == 4) {
              // just forward the key for demo purposes, until pipedrive is implemented
            } else if (licence.key && licence.appid != 11) {
              licence.key = Services.getLoginData(
                models,
                licence.appid,
                licence.id,
                licence.boughtplanid,
                undefined
              );
            } else if (licence.key) {
              const domain = await models.sequelize.query(
                `SELECT ld.id, ld.key FROM licence_data ld INNER JOIN
                  boughtplan_data bpd on ld.boughtplanid = bpd.id WHERE
                  bpd.planid IN (25, 48, 49, 50, 51, 52, 53) AND ld.unitid = :unitid LIMIT 1;`,
                {
                  replacements: { unitid },
                  type: models.sequelize.QueryTypes.SELECT
                }
              );

              const accountData = await dd24Api("GetOneTimePassword", {
                cid: domain[0].key.cid
              });
              if (accountData.code == 200) {
                if (licence.key.cid != accountData.cid) {
                  throw new PartnerError({
                    message: "Accountdata doesn't match!",
                    internalData: { partner: "DD24" }
                  });
                }

                licence.key.loginurl = accountData.loginuri;
                licence.key.password = accountData.onetimepassword;
              } else {
                throw new PartnerError({
                  message: accountData.description,
                  internalData: { partner: "DD24" }
                });
              }
            }
          });

          await Promise.all(createLoginLinks);
        }

        return licences;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchUsersOwnLicences: requiresRights(["view-licences"]).createResolver(
    async (parent, { unitid }, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const departments = await models.sequelize.query(
          "Select id from getDepartments(:company)",
          {
            replacements: { company },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        const departmentIds = Object.values(departments).map(dp => dp.id);

        const departmentPlans = await models.DepartmentApp.findAll({
          where: {
            departmentid: departmentIds
          },
          raw: true
        });

        const departmentPlanIds = Object.values(departmentPlans).map(
          dp => dp.boughtplanid
        );

        const boughtPlans = await models.BoughtPlan.findAll({
          attributes: ["id"],
          where: { id: { [models.Op.notIn]: departmentPlanIds } },
          raw: true
        });

        const bpIds = Object.values(boughtPlans).map(bp => bp.id);

        const licences = await models.Licence.findAll({
          where: { unitid, boughtplanid: bpIds }
        });

        const startTime = Date.now();

        licences.forEach(licence => {
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

        return licences;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchUnitApps: requiresRights(["view-licences"]).createResolver(
    async (parent, { departmentid }, { models }) => {
      try {
        const userApps = await models.sequelize
          .query(
            `SELECT DISTINCT
              bp.id || '-' || :departmentid AS id,
              bp.usedby,
              bp.id                         AS boughtplan,
              bp.description,
              bp.endtime,
              a.name                        AS appname,
              p.appid,
              a.icon                        AS appicon,
              a.logo                        AS applogo,
              COALESCE(l.used, 0)           AS licencesused,
              COALESCE(l.total, 0)          AS licencestotal
            FROM right_data AS r INNER JOIN boughtplan_data bp ON (r.forunit =
                                                                  bp.usedby AND r.type = 'canuselicences' AND
                                                                  r.holder = :departmentid)
                                                                  OR bp.usedby = :departmentid
              INNER JOIN plan_data p
                on bp.planid = p.id
              INNER JOIN app_data a on p.appid = a.id
              LEFT OUTER JOIN (SELECT
                                boughtplanid,
                                count(*)
                                  FILTER (WHERE unitid IS NOT NULL) as used,
                                count(*)                            as total
                              FROM licence_data
                              WHERE endtime IS NULL OR endtime > now()
                              GROUP BY boughtplanid) l ON (l.boughtplanid = bp.id)
            WHERE not a.disabled;`,
            { replacements: { departmentid } }
          )
          .spread(res => res);

        return userApps;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchUnitAppsSimpleStats: requiresRights(["view-licences"]).createResolver(
    async (parent, { departmentid }, { models }) => {
      try {
        const userApps = await models.sequelize
          .query(
            `SELECT DISTINCT
              bp.id || '-' || :departmentid AS id,
              bp.usedby,
              bp.id                         AS boughtplan,
              COALESCE(l.minutestotal, 0)   AS minutestotal,
              COALESCE(l.minutesavg, 0)   AS minutesavg,
              COALESCE(l.minutesmedian, 0)   AS minutesmedian,
              COALESCE(l.minutesmin, 0)   AS minutesmin,
              COALESCE(l.minutesmax, 0)   AS minutesmax
            FROM right_data AS r INNER JOIN boughtplan_data bp ON (r.forunit =
                                                                  bp.usedby AND r.type = 'canuselicences' AND
                                                                  r.holder = :departmentid)
                                                                  OR bp.usedby = :departmentid
              LEFT OUTER JOIN (SELECT
                                boughtplanid,
                                sum(minutesspent) as minutestotal,
                avg(minutesspent) as minutesavg,
                percentile_disc(0.5) WITHIN GROUP (ORDER BY minutesspent)  as minutesmedian,
                min(minutesspent) as minutesmin,
                max(minutesspent) as minutesmax
                              FROM timetracking_data
                              WHERE date_trunc('month', now()) = date_trunc('month', day)
                              GROUP BY boughtplanid)
                              l ON (l.boughtplanid = bp.id);`,
            { replacements: { departmentid } }
          )
          .spread(res => res);

        return userApps;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchSupportToken: requiresAuth.createResolver(
    async (parent, { licenceid }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        const puserdata = models.User.findOne({
          where: { id: unitid },
          raw: true
        });

        //TODO Mehrere EmailAdressen

        const puseremail = models.Email.findOne({
          where: { unitid },
          raw: true
        });

        const [userdata, useremail] = await Promise.all([
          puserdata,
          puseremail
        ]);

        const payload = {
          iat: new Date().getTime() / 1000,
          jti: uuid.v4(),
          name: `${userdata.firstname} ${userdata.lastname}`,
          email: useremail.email
        };

        const supportToken = sign(
          payload,
          "k29s4aV67MB6oWwPQzW8vjmveuOpZmLkDbA2Cl7R1NxV2Wk4"
        );

        return supportToken;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchAppIcon: async (parent, { licenceid }, { models }) => {
    try {
      const app = await models.sequelize.query(
        `
      SELECT DISTINCT ad.icon, ad.name as appname, bd.alias, ld.id as licenceid
      FROM licence_data ld
        INNER JOIN boughtplan_data bd on ld.boughtplanid = bd.id
        INNER JOIN plan_data pd on bd.planid = pd.id
        INNER JOIN app_data ad on pd.appid = ad.id
      WHERE ld.id = :licenceid
      `,
        {
          replacements: { licenceid },
          type: models.sequelize.QueryTypes.SELECT
        }
      );

      return app[0];
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  fetchBoughtplanUsagePerUser: requiresRights(["view-usage"]).createResolver(
    async (parent, { starttime, endtime, boughtplanid }, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);
        const stats = await models.sequelize.query(
          `
          SELECT  tt.boughtplanid boughtplan,
                  tt.unitid unit,
                  sum(minutesspent) totalminutes,
                  array_to_json(array_agg(CASE
                                            WHEN ld.id IS NULL OR ld.unitid != tt.unitid THEN 'unknown date'
                                            WHEN ld.endtime < now() THEN to_char(ld.endtime, 'YYYY-MM-DD')
                                            ELSE NULL END)) licenceenddates
          FROM timetracking_data tt
                  LEFT OUTER JOIN licence_data ld on tt.licenceid = ld.id
                  JOIN department_employee_view dev ON tt.unitid = dev.employee
          WHERE day >= :starttime :: date
            AND day < :endtime :: date
            AND ld.boughtplanid = :boughtplanid
            AND dev.id = :company
          GROUP BY tt.unitid, tt.boughtplanid
          ORDER BY tt.boughtplanid, tt.unitid;
        `,
          {
            replacements: { starttime, endtime, boughtplanid, company },
            raw: true,
            type: models.sequelize.QueryTypes.SELECT
          }
        );
        return stats;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchTotalAppUsage: requiresRights(["view-usage"]).createResolver(
    async (parent, args, { models, token }) => {
      const {
        user: { company }
      } = decode(token);
      try {
        const stats = await models.sequelize.query(
          `
          SELECT appid app, sum(minutesspent) totalminutes
          FROM timetracking_data tt
                JOIN boughtplan_data bp on tt.boughtplanid = bp.id
                JOIN plan_data pd on bp.planid = pd.id
                JOIN department_employee_view dev ON tt.unitid = dev.employee
          WHERE day >= date_trunc('month', current_date)
            AND dev.id = :comany
          GROUP BY appid
          ORDER BY appid;
        `,
          {
            replacements: { company },
            raw: true,
            type: models.sequelize.QueryTypes.SELECT
          }
        );
        return stats;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
