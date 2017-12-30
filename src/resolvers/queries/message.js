import { requiresAuth } from "../../helpers/permissions";
import { Op } from "sequelize";
import _ from "lodash";

export default {
  fetchMessages: requiresAuth.createResolver(
    async (parent, { id, read }, { models }) => {
      let users;
      let apps;

      if (read) {
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

      const result = [];
      users.map(user => result.push(user));
      apps.map(app => result.push(app));

      return _.orderBy(result, "sendtime", "desc");
    }
  )
};
