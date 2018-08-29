// This file contains common operations which don't belong to a specific Component
import { sendEmailToVipfy } from "../../services/mailjet";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createLog } from "../../helpers/functions";

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

  checkEmail: requiresAuth.createResolver(async (parent, { email }, { models }) => {
    if (!email) return { ok: true };

    try {
      const emailExists = await models.Email.findOne({ where: { email } });

      if (emailExists) throw new Error("There already exists an account with this email");

      return { ok: true };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  checkName: requiresAuth.createResolver(async (parent, { name }, { models }) => {
    if (!name) return { ok: true };

    try {
      const nameExists = await models.App.findOne({
        where: { name: { [models.sequelize.Op.iLike]: `%${name}` } }
      });

      if (nameExists) throw new Error({ message: "There already exists an app with this name" });

      return { ok: true };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  })
};
