// This file contains common operations which don't belong to a specific Component
import { sendEmailToVipfy } from "../../services/mailjet";
import { requiresAuth } from "../../helpers/permissions";

/* eslint-disable consistent-return, no-unused-vars */

export default {
  newContactEmail: async (parent, args) => {
    try {
      const messageSent = await sendEmailToVipfy(args);

      return {
        ok: true
      };
    } catch (err) {
      throw new Error(err.message);
    }
  },

  checkEmail: requiresAuth.createResolver(async (parent, { email }, { models }) => {
    if (!email) return { ok: true };

    try {
      const emailExists = await models.Email.findOne({ where: { email } });

      if (emailExists) throw new Error("There already exists an account with this email");

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  }),

  checkName: requiresAuth.createResolver(async (parent, { name }, { models }) => {
    if (!name) return { ok: true };

    try {
      const nameExists = await models.App.findOne({
        where: { name: { [models.sequelize.Op.iLike]: `%${name}` } }
      });

      if (nameExists) throw new Error("There already exists an app with this name");

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
