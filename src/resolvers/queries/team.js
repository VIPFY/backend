import { NormalError } from "../../errors";
import { requiresRights } from "../../helpers/permissions";

export default {
  fetchTeams: requiresRights(["view-teams", "view-licences"]).createResolver(
    async (parent, { userid }, { models }) => {
      try {
        const teams = await models.sequelize.query(
          `SELECT * FROM team_view
            JOIN parentunit_data p ON (p.parentunit = team_view.unitid)
          WHERE childunit = :userid`,
          {
            replacements: { userid },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        return teams;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
