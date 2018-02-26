import { requiresAuth } from "../../helpers/permissions";

export default {
  allUsers: requiresAuth.createResolver(async (parent, args, { models }) => models.User.findAll),
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
      const { user: { dataValues: { email } } } = await models.User.findOne({
        where: { passwordhash: password, verified: false }
      });

      return email;
    } catch ({ message }) {
      throw new Error(message);
    }
  }
};
