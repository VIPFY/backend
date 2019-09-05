import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  updateTutorialProgress: requiresAuth.createResolver(
    async (parent, { tutorialprogress }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

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

        return { ok: true };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  )
};
