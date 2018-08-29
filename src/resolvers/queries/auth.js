import { decode } from "jsonwebtoken";
import { parentAdminCheck } from "../../helpers/functions";
import { requiresAuth } from "../../helpers/permissions";
import { AuthError } from "../../errors";

export default {
  me: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    // they are logged in
    if (token && token != "null") {
      try {
        const {
          user: { unitid }
        } = decode(token);
        const me = await models.User.findById(unitid);

        let message;
        if (me.suspended) {
          message = "This User is suspended!";
          throw new AuthError({ message });
        }

        if (me.banned) {
          message = "This User is banned!";
          throw new AuthError({ message });
        }

        if (me.deleted) {
          message = "This User got deleted!";
          throw new AuthError({ message });
        }
        const user = await parentAdminCheck(me);

        return user;
      } catch (err) {
        throw new AuthError({ message: err.message, internalData: { err } });
      }
    } else throw new AuthError();
  })
};
