import { Op } from "sequelize";
import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  fetchMessages: requiresAuth.createResolver(async (parent, { read }, { models, token }) => {
    let messages;
    const { user: { id } } = decode(token);

    try {
      if (read === true) {
        messages = await models.Message.findAll({
          where: {
            receiver: id,
            deleted: false,
            readtime: { [Op.not]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else if (read === false) {
        messages = await models.Message.findAll({
          where: {
            receiver: id,
            deleted: false,
            readtime: { [Op.eq]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else {
        messages = await models.Message.findAll({
          where: { receiver: id, deleted: false },
          order: [["sendtime", "DESC"]]
        });
      }

      return messages;
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
