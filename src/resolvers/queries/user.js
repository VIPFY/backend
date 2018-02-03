import { requiresAuth } from "../../helpers/permissions";

export default {
  allUsers: requiresAuth.createResolver((parent, args, { models }) =>
    models.User.findAll()
  ),

  me: requiresAuth.createResolver(async (parent, args, { models, user }) => {
    if (user) {
      // they are logged in
      try {
        const me = await models.User.findById(user.id);

        return me.dataValues;
      } catch (err) {
        throw new Error(err.message);
      }
    } else {
      throw new Error("Not Authenticated!");
    }
  }),

  fetchUserByPassword: async (parent, { password }, { models }) => {
    try {
      const user = await models.User.findOne({
        where: { password, userstatus: "toverify" }
      });
      return user.dataValues.email;
    } catch ({ message }) {
      throw new Error(message);
    }
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
