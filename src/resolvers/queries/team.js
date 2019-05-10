import { decode } from "jsonwebtoken";
import { NormalError } from "../../errors";
import { requiresRights } from "../../helpers/permissions";

export default {
  fetchTeams: requiresRights(["view-teams", "view-licences"]).createResolver(
    async (parent, { userid }, { models }) => {
      try {
        const teams = await models.sequelize.query(
          `SELECT * FROM team_view
            JOIN parentunit_data p ON (p.parentunit = team_view.unitid)
          WHERE childunit = :userid and team_view.iscompany = false`,
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
  ),
  fetchCompanyTeams: requiresRights([
    "view-teams",
    "view-licences"
  ]).createResolver(async (parent, args, { models, token }) => {
    try {
      const {
        user: { company }
      } = decode(token);

      const teams = await models.sequelize.query(
        `SELECT * FROM team_view
            JOIN parentunit_data p ON (p.childunit = team_view.unitid)
          WHERE parentunit = :company`,
        {
          replacements: { company },
          type: models.sequelize.QueryTypes.SELECT
        }
      );

      return teams;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  })
};
