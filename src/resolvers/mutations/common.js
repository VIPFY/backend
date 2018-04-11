// This file contains common operations which don't belong to a specific Component
import { sendEmailToVipfy } from "../../services/mailjet";
import { requiresAuth } from "../../helpers/permissions";

/* eslint-disable consistent-return, no-unused-vars */

export default {
  newContactEmail: async (parent, args) => {
    if (process.env.ENVIRONMENT != "testing") {
      try {
        const messageSent = await sendEmailToVipfy(args);

        return {
          ok: true
        };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  },

  checkEmail: requiresAuth.createResolver(async (parent, { email }, { models }) => {
    try {
      const emailExists = await models.Email.findOne({ where: { email } });

      if (emailExists) throw new Error("There already exists an account with this email");

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
