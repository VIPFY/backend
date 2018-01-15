import { requiresAuth } from "../../helpers/permissions";
import { Op } from "sequelize";
import _ from "lodash";

export default {
  fetchMessages: async (parent, { id, read }, { models }) => {
    let users;
    let apps;

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

    const result = [];
    users.map(user => result.push(user));
    apps.map(app => result.push(app));

    return _.orderBy(result, "sendtime", "desc");
  }
};
