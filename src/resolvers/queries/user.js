import { requiresAuth } from "../../helpers/permissions";

export default {
  allUsers: requiresAuth.createResolver((parent, args, { models }) =>
    models.User.findAll()
  ),

  me: requiresAuth.createResolver(async (parent, args, { models, user }) => {
    if (user) {
      // they are logged in
      const me = await models.User.findById(user.id);

      return me.dataValues;
    }
    // not logged in user
    return null;
  }),

  fetchUser: requiresAuth.createResolver((parent, { id }, { models }) =>
    models.User.findById(id)
  ),

  fetchUserByPassword: async (parent, { password }, { models }) => {
    const user = await models.User.findOne({
      where: { password, userstatus: "toverify" }
    });
    return user.dataValues.email;
  },

  allEmployees: requiresAuth.createResolver((parent, args, { models }) =>
    models.Employee.findAll()
  ),

  fetchEmployee: requiresAuth.createResolver((parent, { userId }, { models }) =>
    models.Employee.findOne({ where: { userid: userId } })
  ),

  allUserRights: requiresAuth.createResolver((parent, args, { models }) =>
    models.UserRight.findAll()
  ),

  fetchUserRights: requiresAuth.createResolver(
    (parent, { userid }, { models }) =>
      models.UserRight.findAll({ where: { userid } })
  ),

  fetchUserBills: requiresAuth.createResolver((parent, args, { models }) =>
    models.UserBill.findAll()
  )
};
