import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  updateAddress: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const { user: { unitid } } = decode(token);
      await Object.keys(args).forEach(item => {
        models.Address.update({ [item]: args[item] }, { where: { unitid } });
      });
      return {
        ok: true
      };
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
