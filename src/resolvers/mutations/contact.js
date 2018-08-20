import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../errors";

export default {
  updateAddress: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { unitid }
      } = decode(token);
      if (!args.id) {
        await models.Address.create({ unitid, ...args });

        return { ok: true };
      }

      await models.Address.update({ ...args }, { where: { id: args.id } });

      return { ok: true };
    } catch (err) {
      throw new NormalError({ message: err.message });
    }
  })
};
