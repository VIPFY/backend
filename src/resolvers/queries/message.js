import { Op } from "sequelize";
import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {

  fetchLastDialogMessages: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);

      const query = `SELECT * FROM message_data JOIN (SELECT max(id) id FROM message_data
        WHERE sender = :unitid OR receiver = :unitid GROUP BY CASE WHEN
        sender = :unitid THEN receiver ELSE sender END) t ON t.id = message_data.id`;

      const lastMessages = await models.sequelize
        .query(query, { replacements: { unitid } })
        .spread(res => res);

      return lastMessages;
    } catch (err) {
      throw new Error(err.message);
    }
  }),


  /**
   * Return all messages the current user can see from the messagegroup "group"
   * (i.e. all messages between visibletimestart and visibletimeend of all group memberships
   * of the user for that group), sorted by sendtime.
   */
  fetchDialog: requiresAuth.createResolver(async (parent, { groupid }, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);

      const messages = await models.sequelize
        .query(
          `SELECT md.* FROM message_data AS md INNER JOIN messagegroupmembership_data
        mgmd ON md.sendtime BETWEEN mgmd.visibletimestart AND mgmd.visibletimeend
        WHERE mgmd.unitid = :unitid AND mgmd.groupid = :groupid AND md.receiver = :groupid ORDER BY md.sendtime`,
          { replacements: { unitid, groupid }, raw: true }
        )
        .spread(res => res);

      console.log(messages);

      return messages;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  fetchGroups: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);

      const groups = await models.sequelize
        .query(
          `SELECT
          messagegroup_data.*,
          (
            SELECT md.id
            FROM message_data md
              INNER JOIN messagegroupmembership_data mgmd ON (mgmd.unitid = :unitid AND mgmd.groupid = messagegroup_data.id)
            WHERE
              receiver = messagegroup_data.id
              AND md.sendtime BETWEEN mgmd.visibletimestart AND mgmd.visibletimeend
            ORDER BY sendtime DESC LIMIT 1
          ) as lastmessage,
          (SELECT array_agg(id) FROM messagegroupmembership_data WHERE groupid = messagegroup_data.id) as memberships
        FROM messagegroup_data`,
          { replacements: { unitid } }
        )
        .spread(res => res);

      return groups;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

  fetchUser: requiresAuth.createResolver(async (parent, { userid }, { models, token }) => {
    try {
      const user = await models.User.findById(userid);

      return user;
    } catch (err) {
      throw new Error(err.message);
    }
  }),
};
