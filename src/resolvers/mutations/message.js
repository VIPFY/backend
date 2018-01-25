import { requiresAuth } from "../../helpers/permissions";
import { NEW_MESSAGE, pubsub } from "../../constants";

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
          return {
            ok: false,
            error: err.message
          };
        }
      } else {
        return {
          ok: false,
          error: "Message doesn't exist!"
        };
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
          return {
            ok: false,
            error: "Message already read"
          };
        }
      } catch (err) {
        return {
          ok: false,
          error: err.message
        };
      }
    }
  ),

  sendMessage: requiresAuth.createResolver(
    async (parent, { fromuser, touser, message }, { models }) => {
      const p1 = models.User.findById(fromuser);
      const p2 = models.User.findById(touser);
      const [sender, receiver] = await Promise.all([p1, p2]);

      if (!sender || !receiver) {
        return {
          ok: false,
          error: "User doesn't exist!"
        };
      } else if (sender.id == receiver.id) {
        return {
          ok: false,
          error: "Sender and Receiver can't be the same User!"
        };
      } else if (message && sender && receiver) {
        try {
          const save = await models.Notification.create({
            fromuser,
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
            userId: receiver.id,
            newMessage
          });

          return {
            ok: true,
            id: newMessage.id,
            message
          };
        } catch (err) {
          return {
            ok: false,
            error: err.message
          };
        }
      } else {
        return {
          ok: false,
          error: "Empty Message!"
        };
      }
    }
  )
};
