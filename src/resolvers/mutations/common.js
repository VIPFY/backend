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

      const checkedData = await checkVat(cc, vatNumber);

      return checkedData.name;
    } catch (err) {
      throw new Error("Invalid Vatnumber!");
    }
  }
};
