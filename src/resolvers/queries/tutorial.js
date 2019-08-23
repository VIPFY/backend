import { requiresAuth } from "../../helpers/permissions";

export default {
  tutorialSteps: requiresAuth.createResolver(
    async (_parent, _args, { models }) => {
      try {
        return await models.sequelize.query(
          `SELECT
            tutorial_data.* 
          FROM tutorial_data order by id`,
          { type: models.sequelize.QueryTypes.SELECT }
        );
      } catch (err) {
        throw new Error(err.message);
      }
    }
  )
};
