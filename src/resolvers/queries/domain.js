import { decode } from "jsonwebtoken";
import { requiresRight, requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {
  fetchDomains: requiresAuth.createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const domains = await models.Domain.findAll({
          where: { unitid: company }
        });

        return domains;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
