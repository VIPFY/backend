import { decode } from "jsonwebtoken";
import {
  requiresRights,
  requiresAuth,
  requiresVipfyManagement
} from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {
  fetchCompany: requiresAuth.createResolver(
    async (_parent, _args, { models, session }) => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        return await models.Department.findOne({ where: { unitid: company } });
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchDepartmentsData: requiresRights(["view-departments"]).createResolver(
    async (_parent, _args, { models, session }) => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        const departments = await models.sequelize
          .query("Select * from getDepartmentsData(:company)", {
            replacements: { company }
          })
          .spread(res => res);

        return departments;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchEmployees: requiresRights(["view-employees"]).createResolver(
    async (_parent, _args, { models, session }) => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        const employees = await models.sequelize.query(
          `SELECT DISTINCT id, employee FROM department_employee_view
         WHERE id = :company AND employee NOTNULL`,
          {
            replacements: { company },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        return employees;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  fetchUserSecurityOverview: requiresRights([
    "view-security",
    "myself"
  ]).createResolver(async (_p, { userid }, { models, session }) => {
    try {
      const {
        user: { company }
      } = decode(session.token);

      let query = `SELECT human_data.*,
          u.*,
          COALESCE(twofa.twofactormethods, ARRAY []::json[]) as twofactormethods
        FROM human_data
          JOIN (SELECT DISTINCT employee
            FROM department_employee_view
            WHERE id = :company
              AND employee NOTNULL) t ON (t.employee = human_data.unitid)
          JOIN unit_data u on human_data.unitid = u.id
          LEFT JOIN (SELECT twofa_data.unitid,
            COALESCE(array_agg(json_build_object('twofatype', twofa_data.type, 'twofacreated',
                                                  twofa_data.created, 'twofalastused',
                                                  twofa_data.lastused, 'twofacount', twofa_data.used,
                                                  'twofaid', twofa_data.id)),
            ARRAY []::json[]) as twofactormethods
          FROM twofa_data
          WHERE twofa_data.verified = true
            AND twofa_data.deleted isnull
          GROUP BY twofa_data.unitid) twofa ON human_data.unitid = twofa.unitid
        WHERE not u.deleted`;

      if (userid) {
        query += " AND human_data.unitid = :userid";
      }

      const res = await models.sequelize.query(query, {
        replacements: { company, userid },
        type: models.sequelize.QueryTypes.SELECT
      });

      return res;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  fetchVipfyPlan: requiresAuth.createResolver(
    async (_p, _args, { models, session }) => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        const vipfyPlans = await models.Plan.findAll({
          where: { appid: "aeb28408-464f-49f7-97f1-6a512ccf46c2" },
          attributes: ["id"],
          raw: true
        });

        const planIds = vipfyPlans.map(plan => plan.id);

        // requiresAuth ensures that one exists

        return models.BoughtPlanView.findOne({
          where: {
            payer: company,
            endtime: {
              [models.Op.or]: {
                [models.Op.gt]: models.sequelize.fn("NOW"),
                [models.Op.eq]: null
              }
            },
            buytime: { [models.Op.lt]: models.sequelize.fn("NOW") },
            planid: { [models.Op.in]: planIds }
          },
          raw: true
        });
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchVacationRequests: requiresVipfyManagement(true).createResolver(
    async (_p, args, { models, session }) => {
      try {
        const {
          user: { unitid, company }
        } = decode(session.token);

        const data = await models.sequelize.query(
          `SELECT DISTINCT employee FROM department_employee_view
       WHERE id = :company AND employee NOTNULL`,
          {
            replacements: { company },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        let employeeIDs = data.map(({ employee }) => employee);
        if (args.userid && args.userid == unitid) {
          employeeIDs = employeeIDs.filter(ID => ID == unitid);
        }

        const employees = await models.sequelize.query(
          `
        SELECT uv.id,
        uv.firstname,
        uv.middlename,
        uv.lastname,
        uv.isadmin,
        uv.profilepicture,
        COALESCE(vacation_requests_data.vacationrequests, ARRAY []::json[]) as vacationrequests,
        COALESCE(vacation_year_days_data.vacationdaysperyear) as vacationdaysperyear
          FROM users_view uv
            LEFT JOIN (SELECT vrd.unitid,
                              COALESCE(array_agg(json_build_object('id', vrd.id,'startdate', vrd.startdate, 'enddate', vrd.enddate,
                                                                    'requested', vrd.requested, 'decided', vrd.decided,
                                                                    'days', vrd.days, 'status', vrd.status)),
                                        ARRAY []::json[]) as vacationrequests
                        FROM vacation_requests_data vrd
                        GROUP BY vrd.unitid) vacation_requests_data ON uv.id = vacation_requests_data.unitid
            LEFT JOIN (SELECT vydd.unitid,
                              jsonb_object_agg(vydd.year::TEXT, vydd.days)
                                         as vacationdaysperyear
                        FROM vacation_year_days_data vydd
                        GROUP BY vydd.unitid) vacation_year_days_data ON uv.id = vacation_year_days_data.unitid
          WHERE uv.id IN (:employeeIDs)`,
          {
            replacements: { employeeIDs },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        return employees;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
