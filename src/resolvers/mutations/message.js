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

  sendMessage: requiresAuth.createResolver(
    async (parent, { touser, message }, { models, token }) => {
      const { user: { unitid } } = decode(token);
      const p1 = models.User.findById(unitid);
      const p2 = models.User.findById(touser);
      const [sender, receiver] = await Promise.all([p1, p2]);

      if (!sender || !receiver) {
        throw new Error("User doesn't exist!");
      } else if (sender.id == receiver.id) {
        throw new Error("Sender and Receiver can't be the same User!");
      } else if (message && sender && receiver) {
        try {
          const createMessage = await models.MessageData.create({
            sender: unitid,
            receiver: touser,
            messagetext: message
          });

          const newMessage = {
            ...createMessage.dataValues,
            sender: sender.dataValues,
            receiver: receiver.dataValues
          };

          pubsub.publish(NEW_MESSAGE, {
            userId: receiver.dataValues.unitid,
            newMessage
          });

          return {
            ok: true,
            id: newMessage.id,
            message
          };
        } catch (err) {
          throw new Error(err.message);
        }
      } else throw new Error("Empty Message!");
    }
  )
};
