import { decode } from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";

export const sanitizeMessage = html => sanitizeHtml(message, { allowProtocolRelative: false, allowedTags: ["em", "strong", "b", "i", "br", "p"]});

export const updateLastReadMessage = async (models, unit, group, messageid) => {
    await models.MessageGroupMembership.update({ lastreadmessageid: messageid }, { where: { unitid: unit, group: group, visibletimeend } });
    models.sequelize
        .query(
          `UPDATE messagegroupmembership_date
          SET lastreadmessageid = :messageid
          WHERE unitid = :unit AND groupid = :group
          AND visibletimeend <= now()`,
          { replacements: { unit, group, messageid } }
}