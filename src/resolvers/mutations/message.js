import { decode } from "jsonwebtoken";
import * as messaging from "@vipfy-private/messaging";
import {
  requiresAuth,
  requiresMessageGroupRights
} from "../../helpers/permissions";
import { parentAdminCheck, superset, createLog } from "../../helpers/functions";
import { uploadAttachment } from "../../services/gcloud";
import { NormalError } from "../../errors";
import { NEW_MESSAGE, pubsub } from "../../constants";
import logger from "../../loggers";

export default {
  /**
   * Create a new group between two people. This is only possible if the current user and
   * the receiver are in the same company. Return an error otherwise
   */
  startConversation: requiresAuth.createResolver(
    async (parent, { receiver, defaultrights }, { models, token }) => {
      if (
        !superset(
          [
            "speak",
            "upload",
            "highlight",
            "modifyown",
            "deleteown",
            "deleteother"
          ],
          defaultrights
        )
      ) {
        throw new Error("Defaultrights contains illegal right");
      }

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

        const groupId = await messaging.startConversation(
          models,
          unitid,
          receiver,
          defaultrights
        );

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
   * Post a message to the group with the supplied message,
   * and call markAsRead with the id of the new message.
   * Also sanitzes the message before posting
   * @param {integer} groupid
   * @param {string} message
   */
  sendMessage: requiresMessageGroupRights(["speak"]).createResolver(
    (parent, { groupid, message, file }, { models, token }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = decode(token);
          let newMessage;

          if (file) {
            newMessage = await messaging.sendMessage(
              models,
              unitid,
              file,
              uploadAttachment,
              groupid,
              "",
              ta,
              logger
            );
          } else {
            newMessage = await messaging.sendMessage(
              models,
              unitid,
              null,
              () => {},
              groupid,
              message,
              ta,
              logger
            );
          }

          pubsub.publish(NEW_MESSAGE, {
            newMessage: { ...newMessage.dataValues }
          });

          return {
            ok: true,
            message: newMessage.dataValues.id
          };
        } catch (err) {
          console.log(err);
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  // TODO: update
  setDeleteStatus: requiresAuth.createResolver(async (_p, { id, type }, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      try {
        const { models } = ctx;

        const oldMessage = await models.MessageData.findById(id, { raw: true });
        if (!oldMessage) {
          throw new Error("Message doesn't exist!");
        }

        const deletedMessage = await models.MessageData.update(
          { [type]: true },
          { where: { id }, returning: true, transaction: ta }
        );

        await createLog(
          ctx,
          "setDeleteStatus",
          { oldMessage, deletedMessage: deletedMessage[1] },
          ta
        );

        return { ok: true };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    })
  )
};
