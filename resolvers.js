import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import _ from "lodash";

export default {
  Query: {
    allUsers: (parent, args, { models }) => models.user.findAll(),
    getUser: (parent, { email }, { models, user }) => {
      console.log(user);
      models.user.findOne({
        where: {
          email
        }
      });
    }
  },

  Mutation: {
    updateUser: (parent, { username, newUsername }, { models }) =>
      models.User.update({ username: newUsername }, { where: { username } }),
    deleteUser: (parent, args, { models }) =>
      models.User.destroy({ where: args }),
    register: async (parent, args, { models }) => {
      const user = args;
      user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
      return models.User.create(user);
    },
    login: async (parent, { email, passwordHash }, { models, SECRET }) => {
      const user = await models.user.findOne({ where: { email } });
      if (!user) {
        throw new Error("No user with that email found!");
      }

      const valid = await bcrypt.compare(passwordHash, user.passwordHash);
      if (!valid) {
        throw new Error("Incorrect password!");
      }

      const token = jwt.sign(
        {
          user: _.pick(user, ["id", "email"])
        },
        SECRET,
        {
          expiresIn: "1y"
        }
      );

      return token;
    }
  }
};
