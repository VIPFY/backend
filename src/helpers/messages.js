import { decode } from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";

export const sanitizeMessage = html => sanitizeHtml(html, { allowProtocolRelative: false, allowedTags: ["em", "strong", "b", "i", "br", "p"]});

export const updateLastReadMessage = async (models, unit, group, messageid) => {
  await models.sequelize
    .query(
      `UPDATE messagegroupmembership_data
      SET lastreadmessageid = :messageid
      WHERE unitid = :unit AND groupid = :group
      AND visibletimeend <= now()`,
      { replacements: { unit, group, messageid } });
}