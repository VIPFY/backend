import { decode } from "jsonwebtoken";
import { parentAdminCheck } from "../../helpers/functions";
import { requiresAuth, requiresVipfyAdmin } from "../../helpers/permissions";

export default {
  me: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    // they are logged in
    if (token && token != "null") {
      try {
        const { user: { unitid } } = decode(token);
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
  }),

  admin: requiresVipfyAdmin.createResolver(async (parent, args, { models, token }) => {
    // they are logged in
    if (token) {
      try {
        const { user: { unitid } } = decode(token);
        const p1 = models.User.findById(unitid);
        const p2 = models.Right.findOne({ where: { holder: unitid } });
        const [me, rights] = await Promise.all([p1, p2]);

        if (!rights.type || rights.type != "admin") throw new Error("Not an Admin!");
        if (me.suspended) throw new Error("This User is suspended!");
        if (me.banned) throw new Error("This User is banned!");
        if (me.deleted) throw new Error("This User got deleted!");

        return me.dataValues;
      } catch (err) {
        throw new Error(err.message);
      }
    } else throw new Error("Not an authenticated Admin!");
  })
};
