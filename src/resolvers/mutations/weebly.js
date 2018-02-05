import weeblyApi from "../../services/weebly";
import { requiresAuth } from "../../helpers/permissions";

export default {
  weeblyCreateLoginLink: requiresAuth.createResolver(
    async (parent, { email, domain, plan, agb }) => {
      if (agb) {
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
      } else {
        throw new Error("AGB's not accepted!");
      }
    }
  )
};
