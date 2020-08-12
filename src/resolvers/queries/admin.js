import { decode } from "jsonwebtoken";
import moment from "moment";
import { getStats as serviceStats } from "@vipfy-private/services";
import { requiresVipfyAdmin } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { getAuthStats } from "../../helpers/auth";
import { version as serverVersion } from "../../../package.json";
import { fetchStudyData } from "../../services/aws";

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
          } = decode(session.token);
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
    async (_parent, { id }, { models }) => {
      try {
        return await models.AppDetails.findOne({ where: { id } });
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  allUsers: requiresVipfyAdmin().createResolver(
    async (_parent, { limit, offset }, { models }) => {
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
    async (_parent, { limit, offset }, { models }) => {
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
    async (_parent, { emailid }, { models }) => {
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
    async (_parent, _args, { models }) => {
      try {
        const emails = await models.InboundEmail.findAll();
        return emails;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  adminFetchPendingIntegrations: requiresVipfyAdmin().createResolver(
    async (_parent, _args, { models }) => {
      try {
        return models.sequelize.query(
          `SELECT id, options as key FROM app_data 
            WHERE app_data.options ? 'pending'`,
          { type: models.sequelize.QueryTypes.SELECT }
        );
      } catch (err) {
        throw new Error(err);
      }
    }
  ),

  adminFetchStudyData: requiresVipfyAdmin().createResolver(
    async (_p, _args, { models }) => {
      try {
        const [users, studyData] = await Promise.all([
          models.Study.findAll({
            attributes: ["id", "email", "accept_tos_study", "voucher"],
            raw: true,
          }),
          fetchStudyData(),
        ]);

        const VIPFY_USERS = {
          10: "035d2b90-8489-4ef1-9876-423ada82788b",
          9: "035d2b90-8489-4ef1-9876-423ada82788c",
          11: "035d2b90-8489-4ef1-9876-423ada82788d",
          1: "035d2b90-8489-4ef1-9876-423ada82788e",
          12: "035d2b90-8489-4ef1-9876-423ada82789f",
          8: "035d2b90-8489-4ef1-9876-423ada82788f",
        };

        const monstrosity = studyData.reduce((acc, cV) => {
          // This will obviously break if the structure of the bucket changes
          // eslint-disable-next-line prefer-const
          let [_root, userID, subFolder, file] = cV.Key.split("/");

          if (userID.length < 3) {
            userID = VIPFY_USERS[userID];
          }

          if (!acc[userID]) {
            const user = users.find(({ id }) => id == userID);

            acc[userID] = {
              id: userID,
              email: user.email,
              registrationDate: user.accept_tos_study,
              dates: new Set(),
              amountFiles: 0,
              totalByteSize: 0,
              voucher: user.voucher,
            };
          }

          if (subFolder && file) {
            const date = moment(cV.LastModified).format("DD.MM.YY");

            acc[userID].dates.add(date);
            ++acc[userID].amountFiles;
            acc[userID].totalByteSize += cV.Size;
          }
          return acc;
        }, {});

        users.forEach(user => {
          if (monstrosity[user.id]) {
            // Somehow Graphql does not like a set and returns nothing
            monstrosity[user.id].dates = [...monstrosity[user.id].dates];
          } else {
            monstrosity[user.id] = {
              id: user.id,
              email: user.email,
              registrationDate: user.accept_tos_study,
              dates: [],
              amountFiles: 0,
              totalByteSize: 0,
              voucher: user.voucher,
            };
          }
        });

        return monstrosity;
      } catch (err) {
        throw new Error(err);
      }
    }
  ),
};
