import { decode } from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";

export const sanitizeMessage = html => sanitizeHtml(message, { allowProtocolRelative: false, allowedTags: ["em", "strong", "b", "i", "br", "p"]});

export const updateLastReadMessage = async (models, unit, group, messageid) => {
    //TODO
}