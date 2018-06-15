import { decode } from "jsonwebtoken";
import { requiresAdmin, requiresAuth } from "../../helpers/permissions";

export default {
  fetchCompany: async (parent, { id }, { models }) => {
    try {
      const company = await models.Department.findOne({ where: { unitid: id } });

      return company;
    } catch (err) {
      throw new Error(err.message);
    }
  },

  fetchCompanySize: requiresAdmin.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);
      const size = await models.Department.findOne({ where: { unitid: company } });

      return size.employees;
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  fetchDepartments: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);
      const departments = await models.sequelize
        .query("Select * from getDepartments(?)", {
          replacements: [company]
        })
        .spread(res => res);

      return departments;
    } catch (err) {
      throw new Error(err);
    }
  })
};
