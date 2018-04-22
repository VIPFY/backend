import { requiresAuth, requiresAdmin } from "../../helpers/permissions";

export default {
  allUsers: requiresAuth.createResolver(async (parent, args, { models }) =>
    models.User.findAll({
      order: [
        [models.sequelize.literal(`CASE WHEN firstName = 'Deleted' THEN 1 ELSE 0 END`), "ASC"]
      ]
    })
  ),

  me: requiresAuth.createResolver(async (parent, args, { models, user }) => {
    if (user) {
      // they are logged in
      try {
        const me = await models.User.findById(user.unitid);
        return me.dataValues;
      } catch (err) {
        throw new Error(err.message);
      }
    } else throw new Error("Not Authenticated!");
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
