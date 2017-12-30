import { requiresAuth } from "../../helpers/permissions";

export default {
  allUsers: requiresAuth.createResolver((parent, args, { models }) =>
    models.User.findAll()
  ),

  me: requiresAuth.createResolver((parent, args, { models, user }) => {
    console.log(user);
    if (user) {
      // they are logged in
      return models.User.findOne({
        where: {
          id: user.id
        }
      });
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
