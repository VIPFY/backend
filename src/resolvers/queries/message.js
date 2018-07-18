import { Op } from "sequelize";
import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  fetchMessages: requiresAuth.createResolver(async (parent, { read }, { models, token }) => {
    let messages;
    const {
      user: { unitid }
    } = decode(token);

    try {
      if (read === true) {
        messages = await models.Message.findAll({
          where: {
            receiver: unitid,
            archivetimereceiver: { [Op.eq]: null },
            readtime: { [Op.not]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else if (read === false) {
        messages = await models.Message.findAll({
          where: {
            receiver: unitid,
            archivetimereceiver: { [Op.eq]: null },
            readtime: { [Op.eq]: null }
          },
          order: [["sendtime", "DESC"]]
        });
      } else {
        messages = await models.Message.findAll({
          where: { receiver: unitid, archivetimereceiver: { [Op.eq]: null } },
          order: [["sendtime", "DESC"]]
        });
      }

      return messages;
    } catch (err) {
      throw new Error(err.message);
    }
  }),

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

  fetchDialog: requiresAuth.createResolver(async (parent, { groupid }, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);

      const messages = await models.sequelize
        .query(
          `SELECT md.* FROM message_data AS md INNER JOIN messagegroupmembership_data
        mgmd ON md.sendtime BETWEEN mgmd.visibletimestart AND mgmd.visibletimeend
        WHERE mgmd.unitid = :unitid AND mgmd.groupid = :groupid`,
          { replacements: { unitid, groupid } }
        )
        .spread(res => res);

      return messages;
    } catch (err) {
      throw new Error(err.message);
    }
  })
};
