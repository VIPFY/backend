// This file contains common operations which don't belong to a specific Component
import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { checkVat } from "../../helpers/functions";
/* eslint-disable consistent-return, no-unused-vars */

export default {
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
    async (_parent, { id }, { models, session }) => {
      try {
        const {
          user: { unitid }
        } = decode(session.token);

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
    async (_parent, _args, { models, session }) => {
      try {
        const {
          user: { unitid }
        } = decode(session.token);

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

  ping: async () => ({ ok: true }),

  checkVat: async (_parent, { vat, cc }) => {
    try {
      if (vat.substr(0, 2) != cc) {
        throw new Error("Prefix doesn't match with provided country");
      }

      const vatNumber = vat.substr(2).trim();

      const checkedData = await checkVat(cc, vatNumber);

      return checkedData.name;
    } catch (err) {
      throw new Error("Invalid Vatnumber!");
    }
  },

  logSSOError: requiresAuth.createResolver(
    async (_parent, { eventdata }, { models, ip }) => {
      try {
        console.error(eventdata);

        await models.Log.create({
          ip,
          eventtype: "logSSOError",
          eventdata,
          user: null
        });

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
