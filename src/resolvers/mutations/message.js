import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NEW_MESSAGE, pubsub } from "../../constants";
import { parentAdminCheck } from "../../helpers/functions";

/* eslint-disable no-unused-vars */
export default {
  startConversation: async (parent, { receiver, defaultrights }, { models, token }) => {
    try {
      const {
        user: { unitid, company }
      } = decode(token);

      const p1 = models.User.findById(unitid);
      const p2 = models.User.findById(receiver);

      const [senderExists, receiverExists] = await Promise.all([p1, p2]);

      if (!receiverExists) {
        throw new Error("The receiver doesn't exist!");
      }

      const p3 = parentAdminCheck(models, sender);
      const p4 = parentAdminCheck(models, group);

      const [senderHas, receiverHas] = await Promise.all([p3, p4]);

      if (senderHas.company != receiverHas.company) {
        throw new Error("Sender and receiver are not in the same Company!");
      }

      const group = await models.MessageGroup.create();
      // create MessageGroupMembership for sender and receiver
      const messageGroup = models.MessageGroupMembership.create();
      // default Rechte anlegen
      // const

      // system message erstellen sender null, messagetext leer, payload object system message

      // tag für system message
    } catch (err) {
      throw new Error(err.message);
    }
  },

  // rights
  // speak
  // upload
  // highlight
  // modifiyown
  // deleteown
  // deleteother

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

  sendMessage: async (parent, { groupid, message }, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);
      const p1 = models.User.findById(unitid);
      const p2 = models.MessageGroup.findById(groupid);

      const [sender, group] = await Promise.all([p1, p2]);

      if (!sender) {
        throw new Error("User doesn't exist!");
      } else if (!group) {
        throw new Error("The user doesn't belong to this group!");
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
      }

      return {
        ok: true,
        id: group.id,
        message
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }
};
