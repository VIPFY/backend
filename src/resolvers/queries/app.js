import { decode, sign } from "jsonwebtoken";
import uuid from "uuid";
import moment from "moment";
// import { getLoginData } from "@vipfy-private/weebly";
import * as Services from "@vipfy-private/services";
import dd24Api from "../../services/dd24";
import { NormalError, PartnerError } from "../../errors";
import {
  requiresAuth,
  requiresRights,
  requiresVipfyAdmin,
} from "../../helpers/permissions";
import { companyCheck, concatName } from "../../helpers/functions";
import freshdeskAPI from "../../services/freshdesk";

export default {
  allApps: requiresAuth.createResolver(
    async (_P, { limit, offset, sortOptions }, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);

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
            "options",
            "developer",
            "developername",
            "supportunit",
            "color",
            "hidden",
          ],
          where: {
            disabled: false,
            deprecated: false,
            hidden: false,
            owner: { [models.Op.or]: [null, company] },
          },
          order: sortOptions ? [[sortOptions.name, sortOptions.order]] : "",
        });

        return allApps;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchMarketplaceApps: async (
    _P,
    { limit, offset, sortOptions },
    { models }
  ) => {
    try {
      const allApps = await models.AppDetails.findAll({
        limit,
        offset,
        attributes: [
          "id",
          "description",
          "teaserdescription",
          "name",
          "logo",
          "icon",
          "needssubdomain",
          "developername",
          "developerwebsite",
          "images",
          "options",
          "color",
          "features",
        ],
        where: {
          disabled: false,
          deprecated: false,
          hidden: false,
          owner: null,
        },
        order: sortOptions ? [[sortOptions.name, sortOptions.order]] : "",
      });

      return allApps;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  fetchAppById: requiresRights(["view-apps"]).createResolver(
    async (_parent, { id }, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);

        const app = await models.AppDetails.findOne({
          where: {
            id,
            disabled: false,
            deprecated: false,
            owner: { [models.Op.or]: [null, company] },
          },
        });

        return app;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchAppNameByID: requiresAuth.createResolver(
    async (_parent, { id }, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);

        const app = await models.AppDetails.findOne({
          where: {
            id,
            owner: { [models.Op.or]: [null, company] },
          },
        });

        return app;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchAppByDomain: requiresRights(["view-apps"]).createResolver(
    async (_parent, { domain, hostname }, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);

        let app = null;

        if (hostname) {
          const boughtplan = await models.sequelize.query(
            `Select appid from boughtplan_view join plan_data on planid = plan_data.id
            where key -> 'domain' is not null
                    AND :domain ilike '%' || substring(lower(key ->> 'domain') from E'[^//]*\\//(.+)$') || '%'
            AND usedby = :company;`,
            {
              replacements: { domain, company },
              type: models.sequelize.QueryTypes.SELECT,
            }
          );
          if (boughtplan[0]) {
            app = await models.AppDetails.findOne({
              where: {
                id: boughtplan[0].id,
                disabled: false,
                deprecated: false,
                owner: { [models.Op.or]: [null, company] },
              },
            });
          }
        }

        if (domain && !app) {
          app = await models.AppDetails.findOne({
            where: {
              domains: { [models.Op.contains]: [domain] },
              disabled: false,
              deprecated: false,
              owner: { [models.Op.or]: [null, company] },
            },
          });
        }

        return app;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchLicenceAssignmentsByDomain: requiresRights(["view-apps"]).createResolver(
    async (_parent, { domain, hostname }, { models, session }) => {
      try {
        const {
          user: { company, unitid },
        } = decode(session.token);

        let apps = [];

        if (hostname) {
          const boughtplan = await models.sequelize.query(
            `Select appid from boughtplan_view join plan_data on planid = plan_data.id
            where key -> 'domain' is not null
                    AND :domain ilike '%' || substring(lower(key ->> 'domain') from E'[^//]*\\//(.+)$') || '%'
            AND usedby = :company;`,
            {
              replacements: { domain, company },
              type: models.sequelize.QueryTypes.SELECT,
            }
          );
          if (boughtplan && boughtplan[0]) {
            apps = await models.AppDetails.findAll(
              {
                where: {
                  id: boughtplan[0].id,
                  disabled: false,
                  deprecated: false,
                  owner: { [models.Op.or]: [null, company] },
                },
              },
              { plain: true }
            );
          }
        }

        if (domain) {
          if (apps.length === 0) {
            //Added domains
            apps = await models.AppDetails.findAll(
              {
                where: {
                  domains: { [models.Op.contains]: [domain] },
                  disabled: false,
                  deprecated: false,
                  owner: { [models.Op.or]: [null, company] },
                },
              },
              { plain: true }
            );
          }
          if (apps.length === 0) {
            //Login Domains
            apps = await models.sequelize.query(
              `Select id from app_details where position(:domain in loginurl) > 0
            AND disabled = false AND deprecated = false
            AND (owner is null OR owner = :company);`,
              {
                replacements: { domain, company },
                type: models.sequelize.QueryTypes.SELECT,
              }
            );
          }
        }
        if (apps.length > 0) {
          const licences = await models.sequelize.query(
            `Select licence_view.*, plan_data.appid from licence_view
            join boughtplan_view on boughtplanid = boughtplan_view.id
            join plan_data on planid = plan_data.id
              where unitid = :unitid and plan_data.appid in(:apps)`,
            {
              replacements: { unitid, apps: apps.map(a => a.id) },
              type: models.sequelize.QueryTypes.SELECT,
            }
          );
          const startTime = Date.now();

          licences.forEach(licence => {
            licence.accountid = licence.id;
            licence.id = licence.assignmentid;
            if (licence.disabled) {
              licence.agreed = false;
              licence.key = null;
            }

            if (Date.parse(licence.starttime) > startTime || !licence.agreed) {
              licence.key = null;
            }

            if (licence.endtime && licence.endtime != "infinity") {
              if (Date.parse(licence.endtime) < startTime) {
                licence.key = null;
              }
            }

            if (licence.options) {
              if (licence.options.teamlicence) {
                licence.teamlicence = licence.options.teamlicence;
              }

              if (licence.options.teamlicence) {
                licence.teamaccount = licence.options.teamaccount;
              }
            }
          });

          return licences;
        }

        return null;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchLicence: requiresRights(["myself", "view-licences"]).createResolver(
    async (_parent, { licenceid }, { models }, _info) => {
      try {
        const licence = await models.LicenceDataFiltered.findOne({
          where: { id: licenceid },
        });

        return licence;
      } catch (err) {
        throw new NormalError({
          message: `fetch Licence ${err.message}`,
          internalData: { err },
        });
      }
    }
  ),

  fetchLicenceAssignment: requiresAuth.createResolver(
    async (_parent, { assignmentid }, { models, session }) => {
      try {
        const {
          user: { unitid },
        } = decode(session.token);

        const licences = await models.sequelize.query(
          `SELECT licence_view.*, plan_data.appid FROM licence_view JOIN
        boughtplan_view ON licence_view.boughtplanid = boughtplan_view.id
        JOIN plan_data ON boughtplan_view.planid = plan_data.id
        JOIN app_data ON plan_data.appid = app_data.id
        WHERE licence_view.assignmentid = :assignmentid AND licence_view.unitid = :unitid AND not app_data.disabled`,
          {
            replacements: { assignmentid, unitid },
            type: models.sequelize.QueryTypes.SELECT,
          }
        );

        const startTime = Date.now();

        licences.forEach(licence => {
          licence.accountid = licence.id;
          licence.id = licence.assignmentid;
          if (licence.disabled) {
            licence.agreed = false;
            licence.key = null;
          }

          if (Date.parse(licence.starttime) > startTime || !licence.agreed) {
            licence.key = null;
          }

          if (licence.endtime && licence.endtime != "infinity") {
            if (Date.parse(licence.endtime) < startTime) {
              licence.key = null;
            }
          }

          if (licence.options) {
            if (licence.options.teamlicence) {
              licence.teamlicence = licence.options.teamlicence;
            }

            if (licence.options.teamlicence) {
              licence.teamaccount = licence.options.teamaccount;
            }
          }
        });

        return licences[0];
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchUserLicences: requiresRights(["view-licences"]).createResolver(
    async (_parent, { unitid }, { models }) => {
      try {
        const licences = await models.sequelize.query(
          `SELECT licence_view.*, plan_data.appid FROM licence_view JOIN
        boughtplan_view ON licence_view.boughtplanid = boughtplan_view.id
        JOIN plan_data ON boughtplan_view.planid = plan_data.id
        JOIN app_data ON plan_data.appid = app_data.id
        WHERE licence_view.unitid = :unitid AND not app_data.disabled`,
          { replacements: { unitid }, type: models.sequelize.QueryTypes.SELECT }
        );

        const startTime = Date.now();

        licences.forEach(licence => {
          if (licence.disabled) {
            licence.agreed = false;
            licence.key = null;
          }

          if (Date.parse(licence.starttime) > startTime || !licence.agreed) {
            licence.key = null;
          }

          if (licence.endtime && licence.endtime != "infinity") {
            if (Date.parse(licence.endtime) < startTime) {
              licence.key = null;
            }
          }

          if (licence.options) {
            if (licence.options.teamlicence) {
              licence.teamlicence = licence.options.teamlicence;
            }

            if (licence.options.teamlicence) {
              licence.teamaccount = licence.options.teamaccount;
            }
          }
        });

        return licences;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchUserLicenceAssignments: requiresRights([
    "view-apps",
    "myself",
  ]).createResolver(async (_parent, args, { models, session }) => {
    try {
      let unitid = args.unitid;
      if (!args.unitid) {
        const { user } = decode(session.token);
        unitid = user.unitid;
      }

      const licences = await models.sequelize.query(
        `SELECT licence_view.*, plan_data.appid FROM licence_view JOIN
        boughtplan_view ON licence_view.boughtplanid = boughtplan_view.id
        JOIN plan_data ON boughtplan_view.planid = plan_data.id
        JOIN app_data ON plan_data.appid = app_data.id
        WHERE licence_view.unitid = :unitid AND not app_data.disabled`,
        { replacements: { unitid }, type: models.sequelize.QueryTypes.SELECT }
      );

      const startTime = Date.now();

      licences.forEach(licence => {
        licence.accountid = licence.id;
        licence.id = licence.assignmentid;
        if (licence.disabled) {
          licence.agreed = false;
          licence.key = null;
        }

        if (Date.parse(licence.starttime) > startTime || !licence.agreed) {
          licence.key = null;
        }

        if (licence.endtime && licence.endtime != "infinity") {
          if (Date.parse(licence.endtime) < startTime) {
            licence.key = null;
          }
        }

        if (licence.options) {
          if (licence.options.teamlicence) {
            licence.teamlicence = licence.options.teamlicence;
          }

          if (licence.options.teamlicence) {
            licence.teamaccount = licence.options.teamaccount;
          }
        }
      });

      return licences;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  fetchUnitApps: requiresRights(["view-licences"]).createResolver(
    async (_p, { departmentid }, { models }) => {
      try {
        const userApps = await models.sequelize.query(
          `SELECT DISTINCT
              bp.id || '-' || :departmentid AS id,
              bp.usedby,
              bp.id                         AS boughtplan,
              bp.endtime,
              a.name                        AS appname,
              p.appid,
              a.icon                        AS appicon,
              a.logo                        AS applogo,
              COALESCE(l.used, 0)           AS licencesused,
              COALESCE(l.total, 0)          AS licencestotal
            FROM right_data AS r INNER JOIN boughtplan_view bp ON (r.forunit =
                        bp.usedby AND r.type = 'canuselicences' AND
                        r.holder = :departmentid)
                        OR bp.usedby = :departmentid
              INNER JOIN plan_data p
                on bp.planid = p.id
              INNER JOIN app_data a on p.appid = a.id
              LEFT OUTER JOIN (SELECT
                                boughtplanid,
                                -1 as used,
                                count(*)                            as total
                              FROM licence_data
                              WHERE endtime IS NULL OR endtime > now()
                              GROUP BY boughtplanid) l ON (l.boughtplanid = bp.id)
            WHERE not a.disabled;`,
          {
            replacements: { departmentid },
            type: models.sequelize.QueryTypes.SELECT,
          }
        );

        return userApps;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchUnitAppsSimpleStats: requiresRights(["view-licences"]).createResolver(
    async (_p, { departmentid }, { models }) => {
      try {
        const userApps = await models.sequelize.query(
          `SELECT DISTINCT
              bp.id || '-' || :departmentid AS id,
              bp.usedby,
              bp.id                         AS boughtplan,
              COALESCE(l.minutestotal, 0)   AS minutestotal,
              COALESCE(l.minutesavg, 0)   AS minutesavg,
              COALESCE(l.minutesmedian, 0)   AS minutesmedian,
              COALESCE(l.minutesmin, 0)   AS minutesmin,
              COALESCE(l.minutesmax, 0)   AS minutesmax
            FROM right_data AS r INNER JOIN boughtplan_view bp ON (r.forunit =
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
          {
            replacements: { departmentid },
            type: models.sequelize.QueryTypes.SELECT,
          }
        );

        return userApps;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchBoughtplanUsagePerUser: requiresRights(["view-usage"]).createResolver(
    async (_p, { starttime, endtime, boughtplanid }, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);
        const stats = await models.sequelize.query(
          `
          SELECT  tt.boughtplanid boughtplan,
                  tt.unitid unit,
                  sum(minutesspent) totalminutes,
                  array_to_json(array_agg(CASE
                      WHEN ld.id IS NULL THEN 'unknown date'
                      WHEN ld.endtime < now() THEN to_char(ld.endtime, 'YYYY-MM-DD')
                      ELSE NULL END)) licenceenddates
          FROM timetracking_data tt
            LEFT OUTER JOIN licence_view ld on tt.licenceid = ld.id
          WHERE day >= :starttime :: date
            AND day <= :endtime :: date
            AND ld.boughtplanid = :boughtplanid
          GROUP BY tt.unitid, tt.boughtplanid
          ORDER BY tt.boughtplanid, tt.unitid;
        `,
          {
            replacements: { starttime, endtime, boughtplanid, company },
            raw: true,
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
        return stats;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchTotalUsageMinutes: requiresRights(["view-usage"]).createResolver(
    async (
      _p,
      { starttime, endtime, assignmentid, licenceid, boughtplanid, unitid },
      { models }
    ) => {
      try {
        if (
          [assignmentid, licenceid, boughtplanid, unitid].every(
            v => v === null || v === undefined
          )
        ) {
          throw new Error("Please narrow your request");
        }

        const where = {
          day: {
            [models.Op.lte]: endtime || Infinity,
            [models.Op.gte]: starttime || -Infinity,
          },
        };

        if (assignmentid !== undefined) where.assignmentid = assignmentid;
        // if (licenceid !== null) where.licenceid = licenceid;
        // if (boughtplanid !== null) where.boughtplanid = boughtplanid;
        // if (unitid !== null) where.unitid = unitid;

        const stats = await models.TimeTracking.findAll({
          attributes: [
            [
              models.sequelize.fn("sum", models.sequelize.col("minutesspent")),
              "total_minutes",
            ],
          ],
          where,
          raw: true,
        });

        return stats[0].total_minutes || 0;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchCompanyServices: requiresRights(["view-licences"]).createResolver(
    async (_parent, _args, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);

        return models.sequelize.query(
          `SELECT app_data.id as app,
          COALESCE(array_agg(bpd.id), ARRAY[]::uuid[]) as orbitids
        FROM app_data JOIN plan_data pd on app_data.id = pd.appid
          LEFT JOIN boughtplan_view bpd on pd.id = bpd.planid
        WHERE app_data.name != 'Vipfy' AND (
          usedby = :company AND
        (bpd.endtime is null or bpd.endtime > now())) OR
        (app_data.owner = :company and app_data.options ? 'pending' )
        GROUP BY app_data.id`,
          {
            replacements: { company },
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
      } catch (err) {
        throw new NormalError({
          message: `company Services: ${err.message}`,
          internalData: { err },
        });
      }
    }
  ),

  fetchCompanyService: requiresRights(["view-licences"]).createResolver(
    async (_parent, { serviceid }, { models, session }) => {
      const {
        user: { company },
      } = decode(session.token);
      try {
        const companyServices = await models.sequelize.query(
          `SELECT app_data.id as app,
          COALESCE(array_agg(bpd.id), ARRAY[]::uuid[]) as orbitids
        FROM app_data JOIN plan_data pd on app_data.id = pd.appid
          LEFT JOIN boughtplan_view bpd on pd.id = bpd.planid
        WHERE app_data.name != 'Vipfy' AND ((
          usedby = :company AND
        (bpd.endtime is null or bpd.endtime > now())) OR
        (app_data.owner = :company and app_data.options ? 'pending' ))
        and
          app_data.id = :serviceid
          group by app_data.id`,
          {
            replacements: { company, serviceid },
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
        let returnValue;
        if (companyServices[0]) {
          [returnValue] = companyServices;
        } else {
          returnValue = { app: serviceid, orbitids: null };
        }

        return returnValue;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchTotalAppUsage: requiresRights(["view-usage"]).createResolver(
    async (_p, { starttime, endtime }, { models, session }) => {
      const {
        user: { company },
      } = decode(session.token);
      try {
        let interval = "";
        if (starttime && endtime) {
          interval = `day >= '${moment(starttime).format()}' :: date
          AND day < '${moment(endtime).format()}' :: date
          AND`;
        }

        const stats = await models.sequelize.query(
          `
          SELECT appid app, lv.options, sum(minutesspent) totalminutes
          FROM timetracking_data tt
                JOIN boughtplan_view bp on tt.boughtplanid = bp.id
                JOIN plan_data pd on bp.planid = pd.id
                JOIN department_employee_view dev ON tt.unitid = dev.employee
                JOIN licence_view lv ON tt.licenceid = lv.id
          WHERE ${interval} dev.id = :company
          GROUP BY appid, lv.options
          ORDER BY appid;
        `,
          {
            replacements: { company },
            raw: true,
            type: models.sequelize.QueryTypes.SELECT,
          }
        );

        return stats;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchUseableApps: requiresAuth.createResolver(
    async (_P, { limit, offset, sortOptions }, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);

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
            "options",
            "developer",
            "developername",
            "supportunit",
            "color",
            "hidden",
          ],
          where: {
            disabled: false,
            deprecated: false,
            hidden: false,
            owner: { [models.Op.or]: [null, company] },
          },
          order: sortOptions ? [[sortOptions.name, sortOptions.order]] : "",
        });

        return allApps;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),
  fetchSupportRequests: requiresAuth.createResolver(
    async (_p, _args, { models, session }) => {
      try {
        const {
          user: { unitid },
        } = decode(session.token);

        const user = await models.User.findOne({ where: { id: unitid } });

        if (!user.supporttoken) {
          return null;
        }

        const res = await freshdeskAPI("GET", "tickets", {
          requester_id: user.supporttoken,
        });

        return res.data;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),
  fetchExecutionApps: requiresVipfyAdmin().createResolver(
    async (_p, { appid }, { models }) => {
      try {
        const apps = await models.sequelize.query(
          `
          SELECT * 
          FROM app_data
          WHERE internaldata -> 'execute' is not null
          ${appid ? " AND id = :appid" : ""};
        `,
          {
            replacements: { appid },
            raw: true,
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
        return apps;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchOrbitsOfPlan: requiresAuth.createResolver(
    async (_p, { planid }, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);
        const orbits = await models.sequelize.query(
          `
          SELECT * from orbits_view where usedby=:company and planid=:planid;
        `,
          {
            replacements: { company, planid },
            raw: true,
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
        return orbits;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchOrbit: requiresAuth.createResolver(
    async (_p, { orbitid }, { models, session }) => {
      try {
        const {
          user: { company },
        } = decode(session.token);
        const orbits = await models.sequelize.query(
          `SELECT boughtplan_view.id,
          boughtplan_view.buyer,
          boughtplan_view.planid,
          boughtplan_view.buytime,
          boughtplan_view.endtime,
          boughtplan_view.key,
          boughtplan_view.disabled,
          boughtplan_view.payer,
          boughtplan_view.totalprice,
          boughtplan_view.usedby,
          boughtplan_view.additionalfeatures,
          boughtplan_view.totalfeatures,
          boughtplan_view.alias,
          boughtplan_view.stripeplan,
          boughtplan_view.planinputs,
          COALESCE(array_agg(DISTINCT d3.departmentid), ARRAY[]::uuid[]) AS teams,
          COALESCE(array_agg(DISTINCT licence_data.id), ARRAY[]::uuid[]) AS accounts
         FROM ((boughtplan_view
           LEFT JOIN licence_data ON ((boughtplan_view.id = licence_data.boughtplanid)))
           LEFT JOIN departmentapps_data d3 ON (((boughtplan_view.id = d3.boughtplanid)
           AND (d3.endtime > now()) AND
           (d3.starttime <= now()) AND (NOT (EXISTS ( SELECT 1
                 FROM departmentapps_data dd
                WHERE ((dd.boughtplanid = d3.boughtplanid) AND
                (dd.departmentid = d3.departmentid) AND
                usedby=:company and boughtplan_view.id=:orbitid)))))))
        GROUP BY boughtplan_view.id, boughtplan_view.buyer, boughtplan_view.planid,
        boughtplan_view.buytime, boughtplan_view.endtime, boughtplan_view.key,
        boughtplan_view.disabled, boughtplan_view.payer, boughtplan_view.totalprice,
        boughtplan_view.usedby, boughtplan_view.additionalfeatures,
        boughtplan_view.totalfeatures, boughtplan_view.alias,
        boughtplan_view.stripeplan, boughtplan_view.planinputs;
        `,
          {
            replacements: { orbitid, company },
            raw: true,
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
        return orbits[0];
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),
};
