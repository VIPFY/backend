import { decode } from "jsonwebtoken";
import { weeblyApi } from "../../services/weebly";
import { requiresAuth } from "../../helpers/permissions";

export default {
  // change to requiresAdmin in Production!
  weeblyCreateLoginLink: requiresAuth.createResolver(
    async (parent, { licenceid }, { models, token }) => {
      try {
        const { user: { unitid } } = decode(token);
        const licenceBelongsToUser = await models.Licence.findOne({
          where: {
            unitid,
            boughtplanid: licenceid
          }
        });

        if (!licenceBelongsToUser) {
          throw new Error("This licence doesn't belong to this user!");
        }

        const credentials = licenceBelongsToUser.get("key");
        const endpoint = `user/${credentials.weeblyid}/loginLink`;
        const res = await weeblyApi("POST", endpoint, "");

        return {
          ok: true,
          loginLink: res.link
        };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  )
};
