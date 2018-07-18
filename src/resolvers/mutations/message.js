import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NEW_MESSAGE, pubsub } from "../../constants";

/* eslint-disable no-unused-vars */
export default {
  setDeleteStatus: requiresAuth.createResolver(async (parent, { id, type }, { models }) => {
    const messageExists = await models.MessageData.findById(id);
    if (!messageExists) throw new Error("Message doesn't exist!");

    try {
      await models.MessageData.update({ [type]: true }, { where: { id } });
      return {
        ok: true
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  setReadtime: requiresAuth.createResolver(async (parent, { id }, { models }) => {
    try {
      const message = await models.MessageData.findById(id);
      const { readtime } = message;

      if (!readtime) {
        const now = Date.now();
        await models.MessageData.update({ readtime: now }, { where: { id } });
        return {
          ok: true,
          id,
          message: now
        };
      }
      throw new Error("Message already read");
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  sendMessage: async (parent, { groupid, message }, { models, token }) =>
    models.sequelize.transaction(async ta => {
      try {
        const {
          user: { unitid }
        } = decode(token);
        const p1 = models.User.findById(unitid);
        const p2 = models.MessageGroup.findById(groupid);

        const [sender, group] = await Promise.all([p1, p2]);

        if (!sender) {
          throw new Error("User doesn't exist!");
        } else if (message && sender && group) {
          const createMessage = await models.MessageData.create({
            sender: unitid,
            receiver: groupid,
            messagetext: message
          });

          const newMessage = {
            ...createMessage.dataValues,
            sender: sender.dataValues
            // receiver: receiver.dataValues
          };

          pubsub.publish(NEW_MESSAGE, {
            // userId: receiver.dataValues.unitid,
            newMessage
          });
        } else if (message && sender && !group) {
          const newGroup = await models.MessageGroup.create({}, { raw: true, transaction: ta });

          const createMessage = await models.MessageData.create(
            {
              sender: unitid,
              receiver: newGroup.id,
              messagetext: message
            },
            { transaction: ta }
          );

          const newMessage = {
            ...createMessage.dataValues,
            sender: sender.dataValues
            // receiver: receiver.dataValues
          };

          pubsub.publish(NEW_MESSAGE, {
            // userId: receiver.dataValues.unitid,
            newMessage
          });
        }
        return {
          ok: true,
          id: group.id,
          message
        };
      } catch (err) {
        throw new Error(err.message);
      }
    })
};
