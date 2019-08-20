import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  tutorialSteps: requiresAuth.createResolver(
    async (parent, args, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        const tutorial = await models.sequelize.query(
          `SELECT
            tutorial_data.* 
          
          FROM tutorial_data order by id`,
          {
            //replacements: { unitid },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        return tutorial;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  )
};
