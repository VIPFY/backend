import { decode } from "jsonwebtoken";
import { requiresRight, requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../errors";

export default {
  fetchCompany: async (parent, { id }, { models }) => {
    try {
      const company = await models.Department.findOne({ where: { unitid: id } });

      return company;
    } catch (err) {
      throw new NormalError({ message: err.message });
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
        throw new NormalError({ message: err.message });
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
      throw new NormalError({ message: err.message });
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
      throw new NormalError({ message: err.message });
    }
  })
};
