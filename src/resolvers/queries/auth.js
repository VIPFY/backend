import { decode } from "jsonwebtoken";
import { parentAdminCheck } from "../../helpers/functions";
import { requiresAuth } from "../../helpers/permissions";

export default {
  me: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    // they are logged in
    if (token && token != "null") {
      try {
        const {
          user: { unitid }
        } = decode(token);
        const me = await models.User.findById(unitid);

        if (me.suspended) throw new Error("This User is suspended!");
        if (me.banned) throw new Error("This User is banned!");
        if (me.deleted) throw new Error("This User got deleted!");
        const user = await parentAdminCheck(models, me);

        return user;
      } catch (err) {
        throw new Error(err.message);
      }
    } else throw new Error("Not Authenticated!");
  })
};
