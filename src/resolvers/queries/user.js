import { decode } from "jsonwebtoken";
import { requiresAuth, requiresAdmin } from "../../helpers/permissions";

export default {
  allUsers: requiresAuth.createResolver(async (parent, args, { models }) =>
    models.User.findAll({
      order: [
        [models.sequelize.literal(`CASE WHEN firstName = 'Deleted' THEN 1 ELSE 0 END`), "ASC"]
      ]
    })
  ),

  me: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    // they are logged in
    if (token) {
      const { user: { unitid } } = decode(token);

      try {
        const me = await models.User.findById(unitid);
        if (me.suspended) throw new Error("This User is suspended!");
        if (me.banned) throw new Error("This User is banned!");
        if (me.deleted) throw new Error("This User got deleted!");

        return me.dataValues;
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

  fetchUser: requiresAuth.createResolver(async (parent, { id }, { models }) => {
    try {
      const user = await models.User.findById(id);

      return user;
    } catch ({ message }) {
      throw new Error(message);
    }
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
  },

  allDepartments: requiresAdmin.createResolver(async (parent, args, { models }) =>
    models.Department.findAll({
      where: { deleted: false, banned: false }
    })
  ),

  fetchDepartmentSize: requiresAuth.createResolver(async (parent, { unitid }, { models }) => {
    try {
      const size = await models.ParentUnit.count({ where: { parentunit: unitid } });

      return size;
    } catch ({ message }) {
      throw new Error(message);
    }
  })
};
