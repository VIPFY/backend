import { decode } from "jsonwebtoken";
import { parentAdminCheck } from "../../helpers/functions";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { AuthError, NormalError } from "../../errors";
import moment from "moment";

export default {
  me: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    // they are logged in
    if (token && token != "null") {
      try {
        const {
          user: { unitid }
        } = decode(token);

        const me = await models.User.findById(unitid);
        const user = await parentAdminCheck(me);

        return user;
      } catch (err) {
        throw new NormalError({
          message: `Me-Query-ERROR ${err.message}`,
          internalData: { err }
        });
      }
    } else throw new AuthError();
  }),

  fetchSemiPublicUser: requiresRights(["view-users"]).createResolver(
    async (parent, { unitid }, { models }) => {
      try {
        const me = await models.User.findById(unitid);
        const user = await parentAdminCheck(me);

        return user;
      } catch (err) {
        throw new NormalError({
          message: `fetchSemiPublicUser-Query-ERROR ${err.message}`,
          internalData: { err }
        });
      }
    }
  ),

  checkAuthToken: async (parent, { email, token }, { models }) => {
    try {
      const validToken = await models.Token.findOne({
        where: {
          token,
          type: "signUp",
          email
        },
        raw: true
      });

      if (!validToken) {
        throw new Error("Invalid Token");
      } else if (validToken.usedat) {
        return {
          ok: false,
          used: true
        };
      } else if (moment(validToken.expiresat).isBefore(moment())) {
        return {
          ok: false,
          expired: true
        };
      } else {
        return { ok: true };
      }
    } catch (err) {
      throw new NormalError({ message: err.message });
    }
  }
};
