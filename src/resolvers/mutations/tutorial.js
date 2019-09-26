import { decode } from "jsonwebtoken";
import { requiresAuth } from "../../helpers/permissions";

export default {
  updateTutorialProgress: requiresAuth.createResolver(
    async (_p, { tutorialprogress }, { models, session }) => {
      try {
        const {
          user: { unitid }
        } = decode(session.token);

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
  ),

  closeTutorial: requiresAuth.createResolver(
    async (_p, { tutorial }, { models, session }) => {
      try {
        const {
          user: { unitid }
        } = decode(session.token);

        await models.sequelize.query(
          `Update human_data set tutorialprogress = tutorialprogress::jsonb - :tutorial || :tutorialjson::jsonb where unitid = :unitid`,
          {
            replacements: {
              tutorial,
              tutorialjson: JSON.stringify({ [tutorial]: "closed" }),
              unitid
            },
            raw: true
          }
        );

        return true;
      } catch (err) {
        throw new Error(err.message);
      }
    }
  )
};
