import { decode } from "jsonwebtoken";
import { requiresRights, requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { googleMapsClient } from "../../services/gcloud";

export default {
  fetchCompany: requiresAuth.createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        return await models.Department.findOne({
          where: { unitid: company }
        });
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchCompanySize: requiresRights(["view-employees"]).createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);
        const size = await models.Department.findOne({
          where: { unitid: company }
        });

        return size.employees;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchDepartments: requiresRights(["view-departments"]).createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const departments = await models.sequelize
          .query("Select * from getDepartments(:company)", {
            replacements: { company }
          })
          .spread(res => res);

        return departments;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchDepartmentsData: requiresRights(["view-departments"]).createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

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
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

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
    async (_, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const employees = await models.sequelize.query(
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

        return employees;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  fetchAddressProposal: requiresAuth.createResolver(
    async (parent, { placeid }, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);
        const { name } = await models.Department.findOne({
          where: {
            unitid: company
          },
          attributes: ["name"],
          raw: true
        });

        const res = await googleMapsClient
          .place({
            placeid,
            fields: [
              "formatted_address",
              "international_phone_number",
              "website",
              "address_component"
            ]
          })
          .asPromise();

        res.json.result.name = name;
        return res.json.result;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchVipfyPlan: requiresAuth.createResolver(
    async (_, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

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
