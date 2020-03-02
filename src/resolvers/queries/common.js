import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { checkMailExistance } from "../../helpers/functions";

export default {
  fetchNotifications: requiresAuth.createResolver(
    async (_p, _args, { models, session }) => {
      try {
        const {
          user: { unitid }
        } = decode(session.token);

        return await models.Notification.findAll({
          where: { readtime: { [models.Op.eq]: null }, receiver: unitid },
          order: [["sendtime", "DESC"]],
          raw: true
        });
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  checkMailExistance: requiresAuth.createResolver(async (_p, { email }) => {
    try {
      return checkMailExistance(email);
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  pingServer: async () => ({ ok: true })
};
