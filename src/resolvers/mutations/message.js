import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NEW_MESSAGE, pubsub } from "../../constants";

/* eslint-disable no-unused-vars */
export default {
  setDeleteStatus: requiresAuth.createResolver(async (parent, { id, type }, { models }) => {
    const messageExists = await models.Message.findById(id);
    if (messageExists) {
      try {
        const deleted = await models.Message.update({ [type]: true }, { where: { id } });
        return {
          ok: true
        };
      } catch (err) {
        throw new Error(err.message);
      }
    } else throw new Error("Message doesn't exist!");
  }),

  setReadtime: requiresAuth.createResolver(async (parent, { id }, { models }) => {
    try {
      const read = await models.Message.findById(id);

      if (!read.readtime) {
        const now = Date.now();
        await models.Message.update({ readtime: now }, { where: { id } });
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
      const { user: { id } } = decode(token);
      const p1 = models.Human.findById(id);
      const p2 = models.Human.findById(touser);
      const [sender, receiver] = await Promise.all([p1, p2]);

      if (!sender || !receiver) {
        throw new Error("User doesn't exist!");
      } else if (sender.id == receiver.id) {
        throw new Error("Sender and Receiver can't be the same User!");
      } else if (message && sender && receiver) {
        try {
          const save = await models.Message.create({
            sender: id,
            receiver: touser,
            type: 1,
            message
          });

          const newMessage = {
            ...save.dataValues,
            sender: sender.dataValues,
            receiver: receiver.dataValues
          };

          pubsub.publish(NEW_MESSAGE, {
            userId: receiver.dataValues.id,
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
