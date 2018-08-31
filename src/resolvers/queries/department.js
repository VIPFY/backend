import { decode } from "jsonwebtoken";
import { requiresRight, requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {
  fetchCompany: async (parent, { id }, { models }) => {
    try {
      const company = await models.Department.findOne({ where: { unitid: id } });

      return company;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  fetchCompanySize: requiresRight(["admin"]).createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);
        const size = await models.Department.findOne({ where: { unitid: company } });

        return size.employees;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchDepartments: requiresAuth.createResolver(async (parent, args, { models, token }) => {
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
  }),

  fetchDepartmentsData: requiresAuth.createResolver(async (parent, args, { models, token }) => {
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
  }),

  fetchEmployees: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);

      const employees = await models.sequelize.query(
        `SELECT DISTINCT id, employee FROM department_employee_view
         WHERE id = :company AND employee NOTNULL`,
        { replacements: { company }, type: models.sequelize.QueryTypes.SELECT }
      );

      return employees;
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
