import { Op } from "sequelize";
import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  fetchMessages: requiresAuth.createResolver(async (parent, { read }, { models, token }) => {
    let users;
    const { user: { id } } = decode(token);

    try {
      if (read === true) {
        users = await models.Message.findAll({
          where: {
            receiver: id,
            deleted: false,
            readtime: { [Op.not]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else if (read === false) {
        users = await models.Message.findAll({
          where: {
            receiver: id,
            deleted: false,
            readtime: { [Op.eq]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else {
        users = await models.Message.findAll({
          where: { receiver: id, deleted: false },
          order: [["sendtime", "DESC"]]
        });
      }

      return users;
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
