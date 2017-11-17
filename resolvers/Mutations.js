import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import _ from "lodash";
import { tryLogin } from "../services/auth";
import { requiresAuth } from "../helpers/permissions";

export default {
  updateUser: requiresAuth.createResolver(
    (parent, { firstname, newFirstName }, { models }) =>
      models.User.update({ firstname: newFirstName }, { where: { firstname } })
  ),

  deleteUser: requiresAuth.createResolver(
    async (parent, { id }, { models }) => {
      await models.User.destroy({ where: { id } });
      return "User was deleted";
    }
  ),

  signUp: async (parent, { email, password }, { models }) => {
    //Check whether the email is already in use
    const emailInUse = await models.User.findOne({ where: { email } });
    if (emailInUse) throw new Error("Email already in use!");

    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await models.User.create({ email, password: passwordHash });

      return {
        ok: true,
        user
      };
    } catch (err) {
      return {
        ok: false
      };
    }
  },

  signIn: (parent, { email, password }, { models, SECRET, SECRETTWO }) =>
    tryLogin(email, password, models, SECRET, SECRETTWO),

  signOut: (parent, args, req) => {
    const { user } = req;
    // req.logout();
    return user;
  }
};
