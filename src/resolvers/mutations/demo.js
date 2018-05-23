import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  accessPipedrive: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { unitid } } = decode(token);
      const key = { email: "nv@vipfy.vipfy.com", password: "12345678" };
      await models.Licence.create({ unitid, boughtplanid: 7, agreed: true, disabled: false, key });

      return { ok: true };
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
