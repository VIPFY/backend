import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import _ from "lodash";

export default {
  Query: {
    allUsers: (parent, args, { models }) => models.User.findAll(),
    me: (parent, args, { models, user }) => {
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
    },
    allApps: (parent, args, { models }) => models.App.findAll(),
    allDevelopers: (parent, args, { models }) => models.Developer.findAll(),
    allReviews: (parent, args, { models }) => models.Review.findAll(),
    allAppImages: (parent, args, { models }) => models.AppImage.findAll(),
    fetchApp: (parent, { name }, { models }) =>
      models.App.findOne({
        where: {
          name
        }
      }),
    fetchDeveloper: (parent, { id }, { models }) =>
      models.Developer.findOne({
        where: {
          id
        }
      }),
    fetchReview: (parent, { appid }, { models }) =>
      models.Review.findOne({
        where: {
          appid
        }
      }),
    fetchAppImage: (parent, { appid }, { models }) =>
      models.AppImage.findOne({
        where: {
          appid
        }
      })
  },
  Mutation: {
    updateUser: (parent, { firstname, newFirstName }, { models }) =>
      models.User.update({ firstname: newFirstName }, { where: { firstname } }),
    deleteUser: (parent, args, { models }) =>
      models.User.destroy({ where: args }),
    register: async (parent, args, { models }) => {
      const user = args;
      user.password = await bcrypt.hash(user.password, 12);
      return models.User.create(user);
    },
    login: async (parent, { email, password }, { models, SECRET }) => {
      const user = await models.User.findOne({ where: { email } });
      if (!user) {
        throw new Error("Couldn't find an user with that email");
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error("Incorrect password");
      }

      // token = '12083098123414aslkjdasldf.asdhfaskjdh12982u793.asdlfjlaskdj10283491'
      // verify: needs secret | use me for authentication
      // decode: no secret | use me on the client side
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
