import { decode } from "jsonwebtoken";
import { requiresRights, requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { googleMapsClient } from "../../services/gcloud";

export default {
  fetchCompany: requiresAuth.createResolver(
    async (_parent, _args, { models, session }) => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        return await models.Department.findOne({
          where: { unitid: company }
        });
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

  fetchUserSecurityOverview: requiresRights(["view-security"]).createResolver(
    async (_p, _args, { models, session }) => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        return models.sequelize.query(
          `SELECT human_data.*,
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
          WHERE not u.deleted`,
          {
            replacements: { company },
            type: models.sequelize.QueryTypes.SELECT
          }
        );
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  fetchVipfyPlan: requiresAuth.createResolver(
    async (_p, _args, { models, session }) => {
      try {
        const {
          user: { company }
        } = decode(session.token);

        const vipfyPlans = await models.Plan.findAll({
          where: { appid: 66 },
          attributes: ["id"],
          raw: true
        });

        const planIds = vipfyPlans.map(plan => plan.id);

        // requiresAuth ensures that one exists
        const vipfyPlan = await models.BoughtPlan.findOne({
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
          }
        });

        return vipfyPlan;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
