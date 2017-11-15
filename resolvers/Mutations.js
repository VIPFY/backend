import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import _ from "lodash";

export default {
  updateUser: (parent, { firstname, newFirstName }, { models }) =>
    models.User.update({ firstname: newFirstName }, { where: { firstname } }),

  deleteUser: (parent, args, { models }) =>
    models.User.destroy({ where: args }),

  signUp: async (parent, args, { models }) => {
    const user = args;
    const email = args.email;

    //Check whether the email is already in use
    const emailInUse = await models.User.findOne({ where: { email } });
    if (emailInUse) throw new Error("Email already in use!");

    user.password = await bcrypt.hash(user.password, 12);
    return models.User.create(user);
  },

  signIn: async (parent, { email, password }, { models, SECRET }) => {
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
  },

  signOut: (parent, args, req) => {
    const { user } = req;
    // req.logout();
    return user;
  }
};
