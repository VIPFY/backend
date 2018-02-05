import { Op } from "sequelize";
import { orderBy } from "lodash";
import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  fetchMessages: requiresAuth.createResolver(async (parent, { read, type }, { models, token }) => {
    let users;
    let apps;
    const { user: { id } } = decode(token);

    try {
      if (read === true) {
        users = await models.Notification.findAll({
          where: {
            touser: id,
            deleted: false,
            readtime: { [Op.not]: null }
          },
          order: [["sendtime", "DESC"]]
        });

        apps = await models.AppNotification.findAll({
          where: {
            touser: id,
            deleted: false,
            readtime: { [Op.not]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else if (read === false) {
        users = await models.Notification.findAll({
          where: {
            touser: id,
            deleted: false,
            readtime: { [Op.eq]: null }
          },
          order: [["sendtime", "DESC"]]
        });

        apps = await models.AppNotification.findAll({
          where: {
            touser: id,
            deleted: false,
            readtime: { [Op.eq]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else {
        users = await models.Notification.findAll({
          where: { touser: id, deleted: false },
          order: [["sendtime", "DESC"]]
        });

        apps = await models.AppNotification.findAll({
          where: { touser: id, deleted: false },
          order: [["sendtime", "DESC"]]
        });
      }

      switch (type) {
        case "Notification":
          return orderBy(users, "sendtime", "desc");

        case "AppNotification":
          return orderBy(apps, "sendtime", "desc");

        default: {
          const result = [];
          users.map(user => result.push(user));
          apps.map(app => result.push(app));

          return orderBy(result, "sendtime", "desc");
        }
      }
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
