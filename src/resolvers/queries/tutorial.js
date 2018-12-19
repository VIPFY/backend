import { decode } from "jsonwebtoken";
import { requiresRights, requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { googleMapsClient } from "../../services/gcloud";

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
          
          FROM tutorial_data`,
          {
            //replacements: { unitid },
            type: models.sequelize.QueryTypes.SELECT
          }
        );

        console.log("TUTORIALS", tutorial);

        return tutorial;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  )
};
