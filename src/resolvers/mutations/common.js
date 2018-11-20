// This file contains common operations which don't belong to a specific Component
import { decode } from "jsonwebtoken";
import { sendEmailToVipfy } from "../../services/mailjet";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createLog, checkVat } from "../../helpers/functions";
/* eslint-disable consistent-return, no-unused-vars */

export default {
  newContactEmail: async (parent, args, { models, ip }) =>
    models.sequelize.transaction(async ta => {
      try {
        const p1 = sendEmailToVipfy(args);

        const p2 = createLog(ip, "newContactEmail", args, 0, ta);

        await Promise.all([p1, p2]);

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }),

  checkEmail: async (parent, { email }, { models }) => {
    if (!email) return { ok: true };

    try {
      const emailExists = await models.Email.findOne({ where: { email } });

      if (emailExists) {
        throw new Error("There already exists an account with this email");
      }

      return { ok: true };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  readNotification: requiresAuth.createResolver(
    async (parent, { id }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        await models.Notification.update(
          { readtime: models.sequelize.fn("NOW") },
          { where: { receiver: unitid, id } }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  readAllNotifications: requiresAuth.createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        await models.Notification.update(
          { readtime: models.sequelize.fn("NOW") },
          { where: { receiver: unitid, readtime: { [models.Op.eq]: null } } }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  checkName: requiresAuth.createResolver(
    async (parent, { name }, { models }) => {
      if (!name) return { ok: true };

      try {
        const nameExists = await models.App.findOne({
          where: { name: { [models.sequelize.Op.iLike]: `%${name}` } }
        });

        if (nameExists) {
          throw new Error("There already exists an app with this name");
        }

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  ping: async (parent, args, context) => ({ ok: true }),

  checkVat: async (parent, { vat, cc }) => {
    try {
      if (vat.substr(0, 2) != cc) {
        throw new Error("Prefix doesn't match with provided country");
      }

      const vatNumber = vat.substr(2).trim();

      // No check for German Vatnumbers needed
      if (cc.toUpperCase() == "DE") {
        return { ok: true };
      }

      const checkedData = await checkVat(cc, vatNumber);

      return checkedData.name;
    } catch (err) {
      throw new Error("Invalid Vatnumber!");
    }
  }
};
