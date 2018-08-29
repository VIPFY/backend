import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {
  fetchNotifications: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);

      const notifications = await models.Notification.findAll({
        where: { readtime: { [models.Op.eq]: null }, receiver: unitid },
        order: [["id", "DESC"]]
      });

      console.log(notifications);

      return notifications;
    } catch (err) {
      throw new NormalError({ message: err.message });
    }
  })
};
