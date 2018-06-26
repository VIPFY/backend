import { decode } from "jsonwebtoken";
import { requiresVipfyAdmin } from "../../helpers/permissions";
import { parentAdminCheck } from "../../helpers/functions";

export default {
  admin: requiresVipfyAdmin.createResolver(async (parent, args, { models, token }) => {
    // they are logged in
    if (token && token != "null") {
      try {
        const {
          user: { unitid }
        } = decode(token);
        const p1 = models.User.findById(unitid);
        const p2 = models.Right.findOne({ where: { holder: unitid } });
        const [me, rights] = await Promise.all([p1, p2]);

        if (!rights.type || rights.type != "admin") throw new Error("Not an Admin!");
        if (me.suspended) throw new Error("This User is suspended!");
        if (me.banned) throw new Error("This User is banned!");
        if (me.deleted) throw new Error("This User got deleted!");

        return me.dataValues;
      } catch (err) {
        throw new Error(err.message);
      }
    } else throw new Error("Not an authenticated Admin!");
  }),

  adminFetchBoughtPlans: requiresVipfyAdmin.createResolver(
    async (parent, { company, user }, { models }) => {
      try {
        const boughtPlans = await models.BoughtPlan.findAll({
          where: { payer: company }
        });
        const boughtPlanIds = boughtPlans.map(bP => bP.get("id"));

        const usedLicences = await models.Licence.findAll({
          where: { unitid: user, boughtplanid: boughtPlanIds }
        });

        const uLIds = usedLicences.map(uL => uL.get("boughtplanid"));

        const filteredBPs = boughtPlans.filter(boughtPlan => !uLIds.includes(boughtPlan.id));

        return filteredBPs;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  adminFetchLicences: requiresVipfyAdmin.createResolver(
    async (parent, { id, limit, offset }, { models }) => {
      try {
        const licences = await models.Licence.findAll({ where: { unitid: id }, limit, offset });

        return licences;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  adminFetchLicence: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, boughtplanid }, { models }) => {
      try {
        const licence = await models.Licence.findOne({ where: { unitid, boughtplanid } });

        return licence;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  fetchUserAddresses: requiresVipfyAdmin.createResolver(async (parent, { unitid }, { models }) => {
    try {
      const addresses = await models.Address.findAll({
        where: { unitid },
        order: [["priority", "ASC"]]
      });

      return addresses;
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

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

  allCompanies: requiresVipfyAdmin.createResolver(async (parent, { limit, offset }, { models }) => {
    try {
      const childunits = await models.ParentUnit.findAll({
        attributes: ["childunit"],
        limit,
        offset,
        raw: true
      });
      const ids = childunits.map(id => id.childunit);

      const roots = await models.ParentUnit.findAll({
        where: { parentunit: { [models.sequelize.Op.notIn]: ids } },
        attributes: ["parentunit"],
        limit,
        offset,
        raw: true
      });

      const companyIds = roots.map(root => root.parentunit);

      const companies = await models.Department.findAll({
        where: { unitid: companyIds },
        limit,
        offset
      });

      return companies;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  allDepartments: requiresVipfyAdmin.createResolver(async (parent, args, { models }) =>
    models.Department.findAll({
      where: { deleted: false, banned: false }
    })
  ),

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

  adminFetchEmployees: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, limit, offset }, { models }) => {
      const { DepartmentEmployee, sequelize } = models;
      try {
        const employees = await DepartmentEmployee.findAll({
          attributes: [[sequelize.fn("DISTINCT", sequelize.col("employee")), "employee"]],
          where: { id: unitid },
          limit,
          offset
        });

        return employees;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  freeUsers: async (parent, args, { models }) => {
    try {
      // const allUsers = await models.Human.findAll({
      //   where: { firstname: { [models.Op.ne]: "Deleted" } },
      //   attributes: ["unitid", "firstname", "lastname"]
      // });
      // const allUserIds = allUsers.map(e => e.get("unitid"));
      //
      // const employees = await models.DepartmentEmployee.findAll({
      //   attributes: [
      //     [models.sequelize.fn("DISTINCT", models.sequelize.col("employee")), "employee"]
      //   ],
      //   where: { employee: { [models.Op.in]: allUserIds } }
      // });
      // const employeeIds = employees.map(employee => employee.get("employee"));
      //
      // const freeUsers = allUsers.filter(user => !employeeIds.includes(user.unitid.toString()));

      const employees = await models.DepartmentEmployee.findAll({
        attributes: [
          [models.sequelize.fn("DISTINCT", models.sequelize.col("employee")), "employee"]
        ]
      });
      const employeeIds = employees.map(employee => employee.get("employee"));

      const freeUsers = await models.Human.findAll({
        where: {
          firstname: { [models.Op.ne]: "Deleted" },
          unitid: { [models.Op.notIn]: employeeIds }
        },
        attributes: ["unitid", "firstname", "lastname"]
      });

      return freeUsers;
    } catch (err) {
      throw new Error(err.message);
    }
  }
};
