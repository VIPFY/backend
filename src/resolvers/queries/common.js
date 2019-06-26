import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { checkMailExistance } from "../../helpers/functions";

export default {
  fetchNotifications: requiresAuth.createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        const notifications = await models.Notification.findAll({
          where: { readtime: { [models.Op.eq]: null }, receiver: unitid },
          order: [["id", "DESC"]]
        });

        return notifications;
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),
  checkMailExistance: requiresAuth.createResolver(async (parent, { email }) => {
    try {
      return checkMailExistance(email);
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  })
};
