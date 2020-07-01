import { decode } from "jsonwebtoken";
import { getStats as serviceStats } from "@vipfy-private/services";
import { requiresVipfyAdmin } from "../../helpers/permissions";
import { parentAdminCheck } from "../../helpers/functions";
import { listInvoices } from "../../services/stripe";
import { NormalError } from "../../errors";
import { getAuthStats } from "../../helpers/auth";
import { version as serverVersion } from "../../../package.json";

export default {
  adminFetchAllApps: requiresVipfyAdmin().createResolver(
    async (_parent, { limit, offset, sortOptions }, { models }) => {
      try {
        return await models.AppDetails.findAll({
          limit,
          offset,
          where: { owner: null },
          order: sortOptions ? [[sortOptions.name, sortOptions.order]] : "",
        });
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  admin: requiresVipfyAdmin().createResolver(
    async (_parent, _args, { models, session }) => {
      // they are logged in
      if (session && session.token) {
        try {
          const {
            user: { unitid },
          } = decode(token);
          const me = await models.User.findByPk(unitid);

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

  adminFetchAppById: requiresVipfyAdmin().createResolver(
    async (parent, { id }, { models }) => {
      try {
        return await models.AppDetails.findOne({ where: { id } });
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  allUsers: requiresVipfyAdmin().createResolver(
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
              "ASC",
            ],
          ],
        });

        return users;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  allCompanies: requiresVipfyAdmin().createResolver(
    async (parent, { limit, offset }, { models }) => {
      try {
        const companies = await models.Department.findAll({
          limit,
          offset,
        });

        return companies;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  fetchServerStats: requiresVipfyAdmin().createResolver(async () => ({
    data: {
      caches: { auth: getAuthStats(), services: serviceStats() },

      server: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        version: serverVersion,
      },
    },
  })),

  adminFetchEmailData: requiresVipfyAdmin().createResolver(
    async (parent, { emailid }, { models }) => {
      try {
        const email = await models.InboundEmail.findOne({
          where: { id: emailid },
        });
        return email;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),
  adminFetchInboundEmails: requiresVipfyAdmin().createResolver(
    async (parent, args, { models }) => {
      try {
        const emails = await models.InboundEmail.findAll();
        return emails;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),
  adminFetchPendingIntegrations: requiresVipfyAdmin().createResolver(
    async (parent, args, { models }) => {
      try {
        return models.sequelize.query(
          `SELECT id, options as key FROM app_data 
            WHERE app_data.options ? 'pending'`,
          {
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
      } catch (err) {
        throw new Error(err);
      }
    }
  ),
};
