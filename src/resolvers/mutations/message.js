import { decode } from "jsonwebtoken";
import { requiresAuth, requiresMessageGroupRights } from "../../helpers/permissions";
import { NEW_MESSAGE, pubsub } from "../../constants";
import { parentAdminCheck, superset } from "../../helpers/functions";

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
        models.sequelize.transaction(async ta => {
          const {
            /* eslint-disable no-unused-vars */
            user: { unitid, company }
          } = decode(token);

          const p1 = models.User.findById(unitid, { transaction: ta });
          const p2 = models.User.findById(receiver, { transaction: ta });

          const [senderExists, receiverExists] = await Promise.all([p1, p2]);

          if (!receiverExists) {
            throw new Error("The receiver doesn't exist!");
          }

          // annotate users with their company
          const p3 = parentAdminCheck(models, senderExists);
          const p4 = parentAdminCheck(models, receiverExists);
          const [senderHas, receiverHas] = await Promise.all([p3, p4]);

          if (senderHas.company != receiverHas.company) {
            throw new Error("Sender and receiver are not in the same Company!");
          }

          const group = await models.MessageGroup.create({}, { transaction: ta });
          const groupId = group.dataValues.id;
          const dbqueries = [];
          // create MessageGroupMembership for sender and receiver
          dbqueries.push(
            models.MessageGroupMembership.create({ groupid: groupId, unitid }, { transaction: ta })
          );
          dbqueries.push(
            models.MessageGroupMembership.create(
              { groupid: groupId, unitid: receiver },
              { transaction: ta }
            )
          );

          // create default rights
          dbqueries.push(
            models.MessageGroupRight.bulkCreate(
              defaultrights.map(right => ({
                unitid: null,
                groupid: groupId,
                right
              })),
              { transaction: ta }
            )
          );

          // create rights for sender and receiver
          /* eslint-disable object-shorthand */
          dbqueries.push(
            models.MessageGroupRight.bulkCreate(
              defaultrights.map(right => ({
                unitid: unitid,
                groupid: groupId,
                right
              })),
              { transaction: ta }
            )
          );
          dbqueries.push(
            models.MessageGroupRight.bulkCreate(
              defaultrights.map(right => ({
                unitid: receiver,
                groupid: groupId,
                right
              })),
              { transaction: ta }
            )
          );

          // system message erstellen sender null, messagetext leer, payload object system message
          const payload = {
            systemmessage: {
              type: "groupcreated",
              actor: unitid
            }
          };
          console.log({
            messagetext: "",
            receiver: groupId,
            sender: null,
            payload
          });
          const message = await models.MessageData.create(
            {
              messagetext: "",
              receiver: groupId,
              sender: null,
              payload
            },
            { transaction: ta }
          );

          dbqueries.push(
            models.MessageTag.create(
              {
                unitid: null,
                messageid: message.dataValues.id,
                tag: "system",
                public: "true"
              },
              { transaction: ta }
            )
          );

          await Promise.all(dbqueries);
          return {
            ok: true
          };
        });
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  /**
   * post a message to the group with the supplied message,
   * and call markAsRead with the id of the new message.
   * also sanitzes the message before posting
   */
  sendMessage: requiresAuth.createResolver(
    requiresMessageGroupRights(["speak"]).createResolver(
      async (parent, { group, message }, { models, token }) => {
        try {
          const {
            /* eslint-disable no-unused-vars */
            user: { unitid, company }
          } = decode(token);

          message = sanitizeMessage(message);
          message = await models.MessageData.create({
            messagetext: message,
            sender: unitid,
            receiver: group,
            payload: {}
          });

          await updateLastReadMessage(models, unitid, group, message.dataValues.id);
        } catch (err) {
          throw new Error(err.message);
        }
      }
    )
  ),

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
