import { requiresAuth } from "../../helpers/permissions";
import { NEW_MESSAGE, pubsub } from "../../constants";
import { decode } from "jsonwebtoken";

export default {
  setDeleteStatus: requiresAuth.createResolver(
    async (parent, { id, model, type }, { models }) => {
      const messageExists = await models[model].findById(id);
      if (messageExists) {
        try {
          const deleted = await models[model].update(
            { [type]: true },
            { where: { id } }
          );
          return {
            ok: true
          };
        } catch (err) {
          throw new Error(err.message);
        }
      } else {
        throw new Error("Message doesn't exist!");
      }
    }
  ),

  setReadtime: requiresAuth.createResolver(
    async (parent, { id, model }, { models }) => {
      try {
        const read = await models[model].findById(id);

        if (!read.readtime) {
          const now = Date.now();
          await models[model].update({ readtime: now }, { where: { id } });
          return {
            ok: true,
            id,
            message: now
          };
        } else {
          throw new Error("Message already read");
        }
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  sendMessage: requiresAuth.createResolver(
    async (parent, { touser, message }, { models, token }) => {
      const { user: { id } } = decode(token);
      const p1 = models.User.findById(id);
      const p2 = models.User.findById(touser);
      const [sender, receiver] = await Promise.all([p1, p2]);

      if (!sender || !receiver) {
        throw new Error("User doesn't exist!");
      } else if (sender.id == receiver.id) {
        throw new Error("Sender and Receiver can't be the same User!");
      } else if (message && sender && receiver) {
        try {
          const save = await models.Notification.create({
            fromuser: id,
            touser,
            type: 1,
            message
          });

          const newMessage = {
            ...save.dataValues,
            fromuser: sender.dataValues,
            touser: receiver.dataValues
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
      } else {
        throw new Error("Empty Message!");
      }
    }
  )
};
