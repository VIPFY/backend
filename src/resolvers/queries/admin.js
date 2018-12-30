import { decode } from "jsonwebtoken";
import { getStats as serviceStats } from "@vipfy-private/services";
import { requiresVipfyAdmin } from "../../helpers/permissions";
import { parentAdminCheck } from "../../helpers/functions";
import { listInvoices } from "../../services/stripe";
import { NormalError } from "../../errors";
import { getAuthStats } from "../../helpers/auth";
import { version as serverVersion } from "../../../package.json";

export default {
  adminFetchAllApps: requiresVipfyAdmin.createResolver(
    async (parent, { limit, offset, sortOptions }, { models }) => {
      try {
        const allApps = await models.AppDetails.findAll({
          limit,
          offset,
          order: sortOptions ? [[sortOptions.name, sortOptions.order]] : ""
        });

        return allApps;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  adminFetchListLength: requiresVipfyAdmin.createResolver(
    async (parent, args, { models }) => {
      try {
        const p1 = models.User.count();

        const p2 = models.App.count();

        const childunits = await models.ParentUnit.findAll({
          attributes: ["childunit"],
          raw: true
        });
        const ids = childunits.map(id => id.childunit);

        const roots = await models.ParentUnit.findAll({
          where: { parentunit: { [models.sequelize.Op.notIn]: ids } },
          attributes: ["parentunit"],
          raw: true
        });

        const companyIds = roots.map(root => root.parentunit);

        const p3 = models.Department.count({
          where: { unitid: companyIds }
        });

        const [allUsers, allApps, allCompanies] = await Promise.all([
          p1,
          p2,
          p3
        ]);

        return { allUsers, allApps, allCompanies };
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  admin: requiresVipfyAdmin.createResolver(
    async (parent, args, { models, token }) => {
      // they are logged in
      if (token && token != "null") {
        try {
          const {
            user: { unitid }
          } = decode(token);
          const me = await models.User.findById(unitid);

          if (me.suspended) throw new Error("This User is suspended!");
          if (me.banned) throw new Error("This User is banned!");
          if (me.deleted) throw new Error("This User got deleted!");

          return me.dataValues;
        } catch (err) {
          throw new Error(err.message);
        }
      } else throw new Error("Not an authenticated Admin!");
    }
  ),

  listStripeInvoices: requiresVipfyAdmin.createResolver(async () => {
    try {
      const invoices = await listInvoices();

      return invoices;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  adminFetchBoughtPlans: requiresVipfyAdmin.createResolver(
    async (parent, { company, user }, { models }) => {
      try {
        const boughtPlans = await models.BoughtPlan.findAll({
          where: { usedby: company }
        });
        const boughtPlanIds = boughtPlans.map(bP => bP.get("id"));

        const usedLicences = await models.Licence.findAll({
          where: { unitid: user, boughtplanid: boughtPlanIds }
        });

        const uLIds = usedLicences.map(uL => uL.get("boughtplanid"));

        const filteredBPs = boughtPlans.filter(
          boughtPlan => !uLIds.includes(boughtPlan.id)
        );

        return filteredBPs;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  adminFetchLicences: requiresVipfyAdmin.createResolver(
    async (parent, { id, limit, offset }, { models }) => {
      try {
        const licences = await models.Licence.findAll({
          where: { unitid: id },
          limit,
          offset
        });

        return licences;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  adminFetchLicence: requiresVipfyAdmin.createResolver(
    async (parent, { licenceid }, { models }) => {
      try {
        const licence = await models.Licence.findById(licenceid);

        return licence;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  adminFetchUserAddresses: requiresVipfyAdmin.createResolver(
    async (parent, { unitid }, { models }) => {
      try {
        const addresses = await models.Address.findAll({
          where: { unitid },
          order: [["priority", "ASC"]]
        });

        return addresses;
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  adminFetchAppById: requiresVipfyAdmin.createResolver(
    async (parent, { id }, { models }) => {
      try {
        return await models.AppDetails.findOne({ where: { id } });
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  allUsers: requiresVipfyAdmin.createResolver(
    async (parent, { limit, offset }, { models }) => {
      try {
        const users = await models.User.findAll({
          limit,
          offset,
          order: [
            [
              models.sequelize.literal(
                `CASE WHEN firstName = 'Deleted' THEN 1 ELSE 0 END`
              ),
              "ASC"
            ]
          ]
        });

        return users;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  fetchUser: requiresVipfyAdmin.createResolver(
    async (parent, { id }, { models }) => {
      try {
        const user = await models.User.findById(id);
        const userWithCompany = await parentAdminCheck(user);

        return userWithCompany;
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  allCompanies: requiresVipfyAdmin.createResolver(
    async (parent, { limit, offset }, { models }) => {
      try {
        const companies = await models.Department.findAll({
          limit,
          offset
        });

        return companies;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  allDepartments: requiresVipfyAdmin.createResolver(
    async (parent, args, { models }) =>
      models.Department.findAll({
        where: { deleted: false, banned: false }
      })
  ),

  fetchRecentLogs: requiresVipfyAdmin.createResolver(
    async (parent, { user }, { models }) => {
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
    }
  ),

  adminFetchPlans: requiresVipfyAdmin.createResolver(
    async (parent, { appid }, { models }) => {
      try {
        const allPlans = await models.Plan.findAll({
          where: { appid },
          order: [["price", "ASC"]]
        });
        // Filter out the main plans
        const mainPlans = allPlans.filter(plan => plan.mainplan == null);

        return mainPlans;
      } catch ({ message }) {
        throw new Error(message);
      }
    }
  ),

  adminFetchPlan: requiresVipfyAdmin.createResolver(
    async (parent, { planid }, { models }) => {
      try {
        const plan = await models.Plan.findById(planid);

        return plan;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  adminFetchEmployees: requiresVipfyAdmin.createResolver(
    async (parent, { unitid, limit, offset = 0 }, { models }) => {
      try {
        const employees = await models.sequelize.query(
          `SELECT DISTINCT id, childid, employee FROM department_employee_view
           WHERE id = :unitid AND employee NOTNULL LIMIT :limit OFFSET :offset`,
          {
            replacements: { unitid, limit, offset },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        return employees;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  freeUsers: requiresVipfyAdmin.createResolver(
    async (parent, args, { models }) => {
      try {
        const freeUsers = await models.sequelize.query(
          `SELECT id, firstname, middlename, lastname FROM users_view WHERE
         id NOT IN (SELECT employee FROM department_employee_view WHERE
         department_employee_view.id <> department_employee_view.employee)
         AND users_view.deleted != true`,
          { type: models.sequelize.QueryTypes.SELECT }
        );

        return freeUsers;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  adminFetchDepartments: requiresVipfyAdmin.createResolver(
    async (parent, { company, limit, offset = 0 }, { models }) => {
      try {
        const departments = await models.sequelize.query(
          "Select * from getDepartments(:company) LIMIT :limit OFFSET :offset",
          {
            replacements: { company, limit, offset },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        return departments;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  adminFetchCompany: requiresVipfyAdmin.createResolver(
    async (parent, { id }, { models }) => {
      try {
        const company = await models.Department.findOne({
          where: { unitid: id }
        });

        return company;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchServerStats: requiresVipfyAdmin.createResolver(
    async (parent, args, context) => ({
      data: {
        caches: { auth: getAuthStats(), services: serviceStats() },
        server: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          nodeVersion: process.version,
          version: serverVersion
        }
      }
    })
  )
};
