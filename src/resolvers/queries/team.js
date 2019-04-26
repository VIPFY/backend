import { NormalError } from "../../errors";
import { requiresRights } from "../../helpers/permissions";

export default {
  fetchTeams: requiresRights(["view-teams", "view-licences"]).createResolver(
    async (parent, { userid }, { models }) => {
      try {
        const { parentunit } = await models.ParentUnit.find({
          where: { childunit: userid },
          raw: true
        });

        return models.Team.findAll({ where: { unitid: parentunit } });
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
