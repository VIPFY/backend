import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  updateTutorialProgress: requiresAuth.createResolver(
    async (parent, { tutorialprogress }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        console.log("JSONINPUT", tutorialprogress);

        const a = await models.sequelize.query(
          `Update human_data set tutorialprogress = :tutorialprogress where unitid = :unitid`,
          {
            replacements: {
              tutorialprogress: JSON.stringify(tutorialprogress),
              unitid
            },
            raw: true
          }
        );

        console.log("UPDATE TutorialProgress", a);

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  )
};
