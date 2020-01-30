import { decode, sign } from "jsonwebtoken";
import uuid from "uuid";
import moment from "moment";
// import { getLoginData } from "@vipfy-private/weebly";
import * as Services from "@vipfy-private/services";
import dd24Api from "../../services/dd24";
import { NormalError, PartnerError } from "../../errors";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { companyCheck, concatName } from "../../helpers/functions";
import freshdeskAPI from "../../services/freshdesk";

export default {
  allApps: requiresAuth.createResolver(
    async (_P, { limit, offset, sortOptions }, { models, session }) => {
      try {
        const {
          user: { company }
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
            "hidden"
          ],
          where: {
            disabled: false,
            deprecated: false,
            hidden: false,
            owner: { [models.Op.or]: [null, company] }
          },
          order: sortOptions ? [[sortOptions.name, sortOptions.order]] : ""
        });

        return allApps;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchAppById: requiresRights(["view-apps"]).createResolver(
    async (_parent, { id }, { models, session }) => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        const app = await models.AppDetails.findOne({
          where: {
            id,
            disabled: false,
            deprecated: false,
            owner: { [models.Op.or]: [null, company] }
          }
        });

        return app;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchLicences: requiresRights(["view-licences", "myself"]).createResolver(
    async (_, { licenceid }, { models, session }, info) => {
      try {
        const {
          user: { unitid }
        } = decode(session.token);

        let query = `SELECT licence_view.*, plan_data.appid FROM licence_view JOIN
           boughtplan_data ON licence_view.boughtplanid = boughtplan_data.id
           JOIN plan_data ON boughtplan_data.planid = plan_data.id
           JOIN app_data ON plan_data.appid = app_data.id
           WHERE not app_data.disabled`;

        const replacements = {};

        if (licenceid) {
          query += " AND licence_view.id = :licenceid";
          replacements.licenceid = licenceid;
        }

        const licences = await models.sequelize
          .query(query, { replacements })
          .spread(res => res);

        const isAdmin = (await models.User.findOne({ where: { id: unitid } }))
          .isadmin;

        const startTime = Date.now();
        if (
          info.fieldNodes[0].selectionSet.selections.find(
            item => item.name.value == "key"
          ) !== undefined
        ) {
          const createLoginLinks = licences.map(async licence => {
            if (licence.unitid != unitid && !isAdmin) {
              throw new NormalError({
                message: "This licence doesn't belong to this user!"
              });
            }

            if (licence.disabled) {
              licence.agreed = false;
              licence.key = null;
            }

            if (
              Date.parse(licence.starttime) > startTime ||
              (!licence.agreed && !isAdmin)
            ) {
              licence.key = null;
            }

            if (licence.endtime && licence.endtime != "infinity") {
              if (Date.parse(licence.endtime) < startTime) {
                licence.key = null;
              }
            }

            if (licence.appid == 4) {
              // just forward the key for demo purposes, until pipedrive is implemented
            } else if (licence.key && licence.appid != 11) {
              licence.key = await Services.getLoginData(
                models,
                licence.appid,
                licence.id,
                licence.boughtplanid,
                undefined
              );
            } else if (licence.key) {
              const domain = await models.sequelize.query(
                `SELECT ld.id, ld.key FROM licence_view ld INNER JOIN
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
                  internalData: { partner: "RRP" }
                });
              }
            }
          });

          await Promise.all(createLoginLinks);
        }
        console.log("LICENCES", licences);
        return licences;
      } catch (err) {
        console.error(`Licence Error ${err.message}`);
        throw new NormalError({
          message: `fetch Licence ${err.message}`,
          internalData: { err }
        });
      }
    }
  ),

  fetchLicenceAssignment: requiresAuth.createResolver(
    async (_parent, { assignmentid }, { models, session }) => {
      try {
        const {
          user: { unitid }
        } = decode(session.token);

        const licences = await models.sequelize.query(
          `SELECT licence_view.*, plan_data.appid FROM licence_view JOIN
        boughtplan_data ON licence_view.boughtplanid = boughtplan_data.id
        JOIN plan_data ON boughtplan_data.planid = plan_data.id
        JOIN app_data ON plan_data.appid = app_data.id
        WHERE licence_view.assignmentid = :assignmentid AND licence_view.unitid = :unitid AND not app_data.disabled`,
          {
            replacements: { assignmentid, unitid },
            type: models.sequelize.QueryTypes.SELECT
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

  fetchUsersOwnLicences: requiresRights(["view-licences"]).createResolver(
    async (_p, { unitid }, { models, session }) => {
      try {
        const {
          user: { company }
        } = decode(session.token);

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

  fetchUserLicences: requiresRights(["view-licences"]).createResolver(
    async (_parent, { unitid }, { models }) => {
      try {
        const licences = await models.sequelize.query(
          `SELECT licence_view.*, plan_data.appid FROM licence_view JOIN
        boughtplan_data ON licence_view.boughtplanid = boughtplan_data.id
        JOIN plan_data ON boughtplan_data.planid = plan_data.id
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
    "myself"
  ]).createResolver(async (_parent, args, { models, session }) => {
    try {
      let unitid = args.unitid;
      if (!args.unitid) {
        const { user } = decode(session.token);
        unitid = user.unitid;
      }

      const licences = await models.sequelize.query(
        `SELECT licence_view.*, plan_data.appid FROM licence_view JOIN
        boughtplan_data ON licence_view.boughtplanid = boughtplan_data.id
        JOIN plan_data ON boughtplan_data.planid = plan_data.id
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
                                -1 as used,
                                count(*)                            as total
                              FROM licence_data
                              WHERE endtime IS NULL OR endtime > now()
                              GROUP BY boughtplanid) l ON (l.boughtplanid = bp.id)
            WHERE not a.disabled;`,
          {
            replacements: { departmentid },
            type: models.sequelize.QueryTypes.SELECT
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
          {
            replacements: { departmentid },
            type: models.sequelize.QueryTypes.SELECT
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
          user: { company }
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
            type: models.sequelize.QueryTypes.SELECT
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
          assignmentid === null &&
          licenceid === null &&
          boughtplanid === null &&
          unitid === null
        ) {
          throw new Error("Please narrow your request");
        }

        const where = {
          day: {
            [models.Op.lte]: endtime || Infinity,
            [models.Op.gte]: starttime || -Infinity
          }
        };

        if (assignmentid !== undefined) where.assignmentid = assignmentid;
        // if (licenceid !== null) where.licenceid = licenceid;
        // if (boughtplanid !== null) where.boughtplanid = boughtplanid;
        // if (unitid !== null) where.unitid = unitid;

        const stats = await models.TimeTracking.findAll({
          attributes: [
            [
              models.sequelize.fn("sum", models.sequelize.col("minutesspent")),
              "total_minutes"
            ]
          ],
          where,
          raw: true
        });
        console.log("!", where, boughtplanid, stats);
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
          user: { company }
        } = decode(session.token);

        return models.sequelize.query(
          `SELECT app_data.id as app,
          COALESCE(array_agg(bpd.id), ARRAY[]::bigint[]) as orbitids
        FROM app_data JOIN plan_data pd on app_data.id = pd.appid
          LEFT JOIN boughtplan_data bpd on pd.id = bpd.planid
        WHERE app_data.name != 'Vipfy' AND (
          usedby = :company AND
        (bpd.endtime is null or bpd.endtime > now())) OR
        (app_data.owner = :company and app_data.options ? 'pending' )
        GROUP BY app_data.id`,
          {
            replacements: { company },
            type: models.sequelize.QueryTypes.SELECT
          }
        );
      } catch (err) {
        throw new NormalError({
          message: `company Services: ${err.message}`,
          internalData: { err }
        });
      }
    }
  ),

  fetchCompanyService: requiresRights(["view-licences"]).createResolver(
    async (_parent, { serviceid }, { models, session }) => {
      const {
        user: { company }
      } = decode(session.token);
      try {
        const companyServices = await models.sequelize.query(
          `SELECT app_data.id as app,
          COALESCE(array_agg(bpd.id), ARRAY[]::bigint[]) as orbitids
        FROM app_data JOIN plan_data pd on app_data.id = pd.appid
          LEFT JOIN boughtplan_data bpd on pd.id = bpd.planid
        WHERE app_data.name != 'Vipfy' AND ((
          usedby = :company AND
        (bpd.endtime is null or bpd.endtime > now())) OR
        (app_data.owner = :company and app_data.options ? 'pending' ))
        and
          app_data.id = :serviceid
          group by app_data.id`,
          {
            replacements: { company, serviceid },
            type: models.sequelize.QueryTypes.SELECT
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

  fetchServiceLicences: requiresRights(["view-licences"]).createResolver(
    async (_p, { employees, serviceid }, { models }) => {
      try {
        const emp = employees.map(e => parseInt(e));
        const companyService = await models.sequelize.query(
          `Select licence_data.unitid as id, licence_data.id as licence, licence_data.starttime,
            licence_data.endtime, licence_data.agreed, d2.alias
            from licence_data
              join boughtplan_data d2 on licence_data.boughtplanid = d2.id
              join plan_data plan on d2.planid = plan.id
            where 
              (licence_data.endtime is null or licence_data.endtime > now())
            and licence_data.disabled = false
            and licence_data.options ->> 'teamlicence' is null
            and d2.disabled = false
            and (d2.endtime is null or d2.endtime > now())
            and licence_data.unitid = any('{:employees}')
            and appid = :serviceid`,
          {
            replacements: { employees: emp, serviceid },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        return companyService;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchTotalAppUsage: requiresRights(["view-usage"]).createResolver(
    async (_p, { starttime, endtime }, { models, session }) => {
      const {
        user: { company }
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
                JOIN boughtplan_data bp on tt.boughtplanid = bp.id
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
            type: models.sequelize.QueryTypes.SELECT
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
          user: { company }
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
            "hidden"
          ],
          where: {
            disabled: false,
            deprecated: false,
            hidden: false,
            owner: { [models.Op.or]: [null, company] }
          },
          order: sortOptions ? [[sortOptions.name, sortOptions.order]] : ""
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
          user: { unitid }
        } = decode(session.token);

        const user = await models.User.findOne({ where: { id: unitid } });

        if (!user.supporttoken) {
          return null;
        }

        const res = await freshdeskAPI("GET", "tickets", {
          requester_id: user.supporttoken
        });
        console.log("\x1b[1m%s\x1b[0m", "LOG res", res);

        return res.data;
      } catch (err) {
        console.log("\x1b[1m%s\x1b[0m", "LOG err", err);
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
