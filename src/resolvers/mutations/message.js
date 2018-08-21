import { decode } from "jsonwebtoken";
import messaging from "vipfy-messaging";
import { requiresAuth, requiresMessageGroupRights } from "../../helpers/permissions";
import { parentAdminCheck, superset } from "../../helpers/functions";
import { NormalError } from "../../errors";

export default {
  /**
   * Create a new group between two people. This is only possible if the current user and
   * the receiver are in the same company. Return an error otherwise
   */
  startConversation: requiresAuth.createResolver(
    async (parent, { receiver, defaultrights }, { models, token }) => {
      if (
        !superset(
          ["speak", "upload", "highlight", "modifyown", "deleteown", "deleteother"],
          defaultrights
        )
      ) {
        throw new Error("defaultrights contains illegal right");
      }
      console.log("b");
      try {
        const {
          /* eslint-disable no-unused-vars */
          user: { unitid, company }
        } = decode(token);

        const p1 = models.User.findById(unitid);
        const p2 = models.User.findById(receiver);

        const [senderExists, receiverExists] = await Promise.all([p1, p2]);

        if (!receiverExists) {
          throw new Error("The receiver doesn't exist!");
        }

        // annotate users with their company
        const p3 = parentAdminCheck(senderExists);
        const p4 = parentAdminCheck(receiverExists);
        const [senderHas, receiverHas] = await Promise.all([p3, p4]);

        if (senderHas.company != receiverHas.company) {
          throw new Error("Sender and receiver are not in the same Company!");
        }

        const groupId = await messaging.startConversation(models, unitid, receiver, defaultrights);

        return {
          ok: true,
          messagegroup: groupId
        };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  /**
   * post a message to the group with the supplied message,
   * and call markAsRead with the id of the new message.
   * also sanitzes the message before posting
   */
  sendMessage: requiresMessageGroupRights(["speak"]).createResolver(
    async (parent, { groupid, message }, { models, token }) => {
      try {
        const {
          /* eslint-disable no-unused-vars */
          user: { unitid, company }
        } = decode(token);

        const messageid = messaging.sendMessage(models, unitid, groupid, message);
        return {
          ok: true,
          message: messageid
        };
      } catch (err) {
        throw new NormalError({ message: err.message });
      }
    }
  ),

  // TODO: update
  setDeleteStatus: requiresAuth.createResolver(async (parent, { id, type }, { models }) => {
    const messageExists = await models.MessageData.findById(id);
    if (!messageExists) {
      throw new NormalError({ message: "Message doesn't exist!" });
    }

    try {
      await models.MessageData.update({ [type]: true }, { where: { id } });
      return {
        ok: true
      };
    } catch (err) {
      throw new NormalError({ message: err.message });
    }
  })
};
