import { requiresAuth } from "../../helpers/permissions";

export default {
  me: requiresAuth.createResolver(async (parent, args, { models, user }) => {
    if (user) {
      // they are logged in
      try {
        const me = await models.Human.findById(user.id);

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
      const { user: { dataValues: { id } } } = await models.Human.findOne({
        where: { passwordhash: password }
      });

      const email = await models.Email.findOne({
        where: { unitid: id, verified: false }
      });

      return email.dataValues.email;
    } catch ({ message }) {
      throw new Error(message);
    }
  }
};
