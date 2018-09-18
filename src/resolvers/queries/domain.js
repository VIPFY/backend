import { decode } from "jsonwebtoken";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {
  fetchDomains: requiresRights(["view-domains"]).createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { company }
        } = decode(token);

        const domains = await models.Domain.findAll({
          where: { unitid: company },
          order: [["id", "ASC"]]
        });

        return domains;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
