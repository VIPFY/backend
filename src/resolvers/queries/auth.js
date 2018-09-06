import { decode } from "jsonwebtoken";
import { parentAdminCheck } from "../../helpers/functions";
import { requiresAuth } from "../../helpers/permissions";
import { AuthError, NormalError } from "../../errors";

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
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    } else throw new AuthError();
  })
};
