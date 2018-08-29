import { decode } from "jsonwebtoken";
import * as messaging from "vipfy-messaging";
import { requiresAuth, requiresMessageGroupRights } from "../../helpers/permissions";
import { parentAdminCheck, superset, createLog } from "../../helpers/functions";
import { NormalError } from "../../errors";
import { NEW_MESSAGE, pubsub } from "../../constants";

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
        throw new Error("Defaultrights contains illegal right");
      }
      console.log("b");
      try {
        const {
          user: { unitid }
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
        throw new NormalError({ message: err.message, internalData: { err } });
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
          user: { unitid }
        } = decode(token);

        const messageid = messaging.sendMessage(models, unitid, groupid, message);

        pubsub.publish(NEW_MESSAGE, {
          receiver: groupid,
          message
        });

        return {
          ok: true,
          message: messageid
        };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  // TODO: update
  setDeleteStatus: requiresAuth.createResolver(
    async (parent, { id, type }, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);

          const oldMessage = await models.MessageData.findById(id, { raw: true });
          if (!oldMessage) {
            throw new Error("Message doesn't exist!");
          }

          const deletedMessage = await models.MessageData.update(
            { [type]: true },
            { where: { id }, returning: true, transaction: ta }
          );

          await createLog(
            ip,
            "setDeleteStatus",
            { oldMessage, deletedMessage: deletedMessage[1] },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({ message: err.message, internalData: { err } });
        }
      })
  )
};
