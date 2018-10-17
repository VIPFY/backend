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

        return await models.Department.findOne({ where: { unitid: company } });
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
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const employees = await models.sequelize.query(
          `SELECT
            human_data.*,
            u.*
          FROM human_data
            JOIN (SELECT DISTINCT employee
                  FROM department_employee_view
                  WHERE id = :company AND employee NOTNULL) t ON (t.employee = human_data.unitid)
            JOIN unit_data u on human_data.unitid = u.id
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
    async (parent, { placeid }) => {
      try {
        const res = await googleMapsClient
          .place({
            placeid,
            fields: [
              "name",
              "formatted_address",
              "international_phone_number",
              "website",
              "address_component"
            ]
          })
          .asPromise();

        return res.json.result;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
