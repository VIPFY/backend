import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import _ from "lodash";
import { tryLogin } from "../services/auth";
import { requiresAuth } from "../helpers/permissions";
import mailjet from "../services/mailjet";

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

  signUp: async (parent, { email, newsletter }, { models }) => {
    //Check whether the email is already in use
    const emailInUse = await models.User.findOne({ where: { email } });
    if (emailInUse) throw new Error("Email already in use!");

    try {
      //A password musst be created because otherwise the not null rule of the
      //database is violated
      const passwordHash = await bcrypt.hash(email, 5);
      const user = await models.User.create({
        email,
        newsletter,
        password: passwordHash
      });
      mailjet(user.email);
      return {
        ok: true,
        user
      };
    } catch (err) {
      console.log(err);
      return {
        ok: false
      };
    }
  },

  signUpConfirm: async (parent, { email, password }, { models }) => {
    const emailExists = await models.User.findOne({ where: { email } });
    if (!emailExists) return { ok: false, error: "Email not found!" };

    const isVerified = await models.User.findOne({
      where: { email, userstatus: "normal" }
    });
    if (isVerified) return { ok: false, error: "User already verified!" };

    try {
      const passwordHash = await bcrypt.hash(password, 12);

      const activate = await models.User.update(
        { password: passwordHash, userstatus: "normal" },
        { where: { email } }
      );

      return {
        ok: true
      };
    } catch (err) {
      return {
        ok: false,
        error: "Couldn't activate user!"
      };
    }
  },

  signIn: (parent, { email, password }, { models, SECRET, SECRETTWO }) =>
    tryLogin(email, password, models, SECRET, SECRETTWO),

  forgotPassword: async (parent, { email }, { models }) => {
    const emailExists = await models.User.findOne({ where: { email } });
    if (!emailExists)
      return {
        ok: false,
        error: "Email doesn't exist!"
      };

    try {
      mailjet(email);
      //Exchange this for a new solution when a proper mailjet template exists
      const activate = await models.User.update(
        { userstatus: "toverify" },
        { where: { email } }
      );

      return {
        ok: true,
        email
      };
    } catch (err) {
      return {
        ok: false,
        error: err
      };
    }
  },

  signOut: (parent, args, req) => {
    const { user } = req;
    // req.logout();
    return user;
  }
};
