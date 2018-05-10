import { decode } from "jsonwebtoken";
import { parentAdminCheck } from "../../helpers/functions";
import { requiresAuth, requiresAdmin } from "../../helpers/permissions";

export default {
  me: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    // they are logged in
    if (token) {
      const { user: { unitid } } = decode(token);

      try {
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

  admin: requiresAdmin.createResolver(async (parent, args, { models, token }) => {
    // they are logged in
    if (token) {
      const { user: { unitid } } = decode(token);
      try {
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
  }),

  // THIS HAS TO BE CHANGED!!!
  fetchUserByPassword: async (parent, { password }, { models }) => {
    try {
      const { user: { dataValues: { email } } } = await models.User.findOne({
        where: { passwordhash: password, verified: false }
      });

      return email;
    } catch ({ message }) {
      throw new Error(message);
    }
  }
};
