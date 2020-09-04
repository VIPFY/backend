import { decode } from "jsonwebtoken";
import { NormalError } from "../../errors";
import { requiresRights, requiresAuth } from "../../helpers/permissions";
import { checkCompanyMembership } from "../../helpers/companyMembership";

export default {
  fetchTeams: requiresRights([["view-teams", "view-licences"]]).createResolver(
    async (_parent, { userid }, { models }) => {
      try {
        const teams = await models.sequelize.query(
          `SELECT * FROM team_view
            JOIN parentunit_data p ON (p.parentunit = team_view.unitid)
          WHERE childunit = :userid and team_view.iscompany = false`,
          {
            replacements: { userid },
            type: models.sequelize.QueryTypes.SELECT,
          }
        );

        return teams;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchCompanyTeams: requiresRights([
    ["view-teams", "view-licences"],
  ]).createResolver(async (_parent, _args, { models, session }) => {
    try {
      const {
        user: { company },
      } = decode(session.token);

      const teams = await models.sequelize.query(
        `SELECT * FROM team_view
            JOIN parentunit_data p ON (p.childunit = team_view.unitid)
          WHERE parentunit = :company`,
        {
          replacements: { company },
          type: models.sequelize.QueryTypes.SELECT,
        }
      );

      return teams;
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  fetchTeam: requiresRights([["view-teams", "view-licences"]]).createResolver(
    async (parent, { teamid }, { models }) => {
      try {
        const team = await models.sequelize.query(
          `SELECT * FROM team_view WHERE unitid = :teamid`,
          {
            replacements: { teamid },
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
        return team && team[0];
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchPublicTeam: requiresAuth().createResolver(
    async (_, { teamid }, { models, session }) => {
      const {
        user: { company },
      } = await decode(session.token);
      await checkCompanyMembership(models, company, teamid, "team");
      try {
        const team = await models.sequelize.query(
          `SELECT * FROM team_view WHERE unitid = :teamid`,
          {
            replacements: { teamid },
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
        return team && team[0];
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchTeamName: requiresAuth.createResolver(
    async (parent, { teamid }, { models }) => {
      try {
        const team = await models.sequelize.query(
          `SELECT name FROM department_data WHERE unitid = :teamid`,
          {
            replacements: { teamid },
            type: models.sequelize.QueryTypes.SELECT,
          }
        );
        return team && team[0] && team[0].name;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),
};
