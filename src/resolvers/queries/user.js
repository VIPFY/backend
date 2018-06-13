import { decode } from "jsonwebtoken";
import { requiresAdmin, requiresVipfyAdmin, requiresAuth } from "../../helpers/permissions";
import { parentAdminCheck } from "../../helpers/functions";

export default {
  allUsers: requiresVipfyAdmin.createResolver(async (parent, { limit, offset }, { models }) =>
    models.User.findAll({
      limit,
      offset,
      order: [
        [models.sequelize.literal(`CASE WHEN firstName = 'Deleted' THEN 1 ELSE 0 END`), "ASC"]
      ]
    })
  ),

  fetchUser: requiresVipfyAdmin.createResolver(async (parent, { id }, { models }) => {
    try {
      const user = await models.User.findById(id);
      const userWithCompany = await parentAdminCheck(models, user);

      return userWithCompany;
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  fetchCompany: async (parent, { id }, { models }) => {
    try {
      const company = await models.Department.findOne({ where: { unitid: id } });

      return company;
    } catch (err) {
      throw new Error(err.message);
    }
  },

  allCompanies: async (parent, args, { models }) => {
    try {
      const childunits = await models.ParentUnit.findAll({ attributes: ["childunit"] });
      const ids = childunits.map(id => id.get("childunit"));

      const roots = await models.ParentUnit.findAll({
        where: { parentunit: { [models.sequelize.Op.notIn]: ids } }
      });

      const companyIds = roots.map(root => root.get("parentunit"));
      const companies = await models.Department.findAll({ where: { unitid: companyIds } });

      return companies;
    } catch (err) {
      throw new Error(err.message);
    }
  },

  allDepartments: requiresVipfyAdmin.createResolver(async (parent, args, { models }) =>
    models.Department.findAll({
      where: { deleted: false, banned: false }
    })
  ),

  fetchCompanySize: requiresAdmin.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { company } } = decode(token);
      const size = await models.Department.findOne({ where: { unitid: company } });

      return size.employees;
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  fetchRecentLogs: requiresVipfyAdmin.createResolver(async (parent, { user }, { models }) => {
    try {
      const logs = await models.Log.findAll({
        where: { user },
        limit: 5,
        order: [["time", "DESC"]]
      });

      return logs;
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  fetchDepartments: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { company } } = decode(token);
      const departments = await models.sequelize
        .query("Select * from getDepartments(?)", {
          replacements: [company]
        })
        .spread(res => res);

      return departments;
    } catch (err) {
      throw new Error(err);
    }
  }),

  fetchEmployees: requiresAuth.createResolver(async (parent, { unitid }, { models }) => {
    const { DepartmentEmployee, sequelize } = models;
    try {
      const employees = await DepartmentEmployee.findAll({
        attributes: [[sequelize.fn("DISTINCT", sequelize.col("employee")), "employee"]],
        where: { id: unitid }
      });

      return employees;
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
