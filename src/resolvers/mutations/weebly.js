import { decode } from "jsonwebtoken";
import weeblyApi from "../../services/weebly";
import { requiresAdmin, requiresAuth } from "../../helpers/permissions";

export default {
  weeblyCreateLoginLinkNewUser: requiresAdmin.createResolver(
    async (parent, { email, domain, plan, boughtplanid }, { models, token }) => {
      const { user: { unitid } } = decode(token);
      const method = "POST";
      let endpoint = "user";
      let requestData = {
        language: "en",
        test_mode: true,
        email
      };
      let userId;
      let siteId;

      try {
        const res = await weeblyApi(method, endpoint, requestData);
        userId = res.user.user_id;
        await models.Licence.update(
          { key: JSON.stringify({ weeblyid: userId }) },
          { where: { unitid, boughtplanid } }
        );
      } catch (err) {
        throw new Error(`The email ${email} is already in use at Weebly!`);
      }

      endpoint = `user/${userId}/site`;
      requestData = { domain };
      try {
        const res = await weeblyApi(method, endpoint, requestData);
        siteId = res.site.site_id;
      } catch (err) {
        throw new Error(err.message);
      }

      endpoint = `/user/${userId}/site/${siteId}/plan`;
      requestData = { plan_id: plan };
      try {
        // eslint-disable-next-line
        const res = await weeblyApi(method, endpoint, requestData);
      } catch (err) {
        throw new Error(err.message);
      }

      endpoint = `user/${userId}/site/${siteId}/loginLink`;
      try {
        const res = await weeblyApi(method, endpoint, "");

        return {
          ok: true,
          loginLink: res.link
        };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

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
