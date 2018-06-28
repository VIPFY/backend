import { Op } from "sequelize";
import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  fetchMessages: requiresAuth.createResolver(async (parent, { read }, { models, token }) => {
    let messages;
    const {
      user: { unitid }
    } = decode(token);

    try {
      if (read === true) {
        messages = await models.Message.findAll({
          where: {
            receiver: unitid,
            archivetimereceiver: { [Op.eq]: null },
            readtime: { [Op.not]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else if (read === false) {
        messages = await models.Message.findAll({
          where: {
            receiver: unitid,
            archivetimereceiver: { [Op.eq]: null },
            readtime: { [Op.eq]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else {
        messages = await models.Message.findAll({
          where: { receiver: unitid, archivetimereceiver: { [Op.eq]: null } },
          order: [["sendtime", "DESC"]]
        });
      }

      return messages;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  fetchLastDialogMessage: requiresAuth.createResolver(
    async (parent, { sender }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        const messages = await models.MessageData.findAll({
          where: {
            [models.Op.or]: [{ sender }, { receiver: unitid }]
          }
        });

        const lastMessage = messages.sort((a, b) => a.sendtime - b.sendtime).pop();

        return lastMessage;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  fetchDialog: requiresAuth.createResolver(async (parent, { sender }, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);

      const messages = await models.MessageData.findAll({
        where: {
          [models.Op.or]: [
            {
              sender,
              receiver: unitid
            },
            { receiver: sender, sender: unitid }
          ]
        },
        group: ["id"]
      });

      return messages;
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
