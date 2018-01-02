import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { tryLogin, createTokens } from "../../services/auth";
import { requiresAuth } from "../../helpers/permissions";
import mailjet from "../../services/mailjet";
import _ from "lodash";

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

  signUp: async (
    parent,
    { email, newsletter },
    { models, SECRET, SECRETTWO }
  ) => {
    //Check whether the email is already in use
    const emailInUse = await models.User.findOne({ where: { email } });
    if (emailInUse) throw new Error("Email already in use!");

    try {
      //A password musst be created because otherwise the not null rule of the
      //database is violated
      const passwordHash = await bcrypt.hash(email, 5);

      //Change the given hash to improve security
      const start = _.random(3, 8);
      const newHash = passwordHash.replace("/", 2).substr(start);

      const user = await models.User.create({
        email,
        newsletter,
        password: newHash
      });
      console.log(SECRET, SECRETTWO);
      mailjet(user.email, newHash);
      const refreshSecret = user.password + SECRETTWO;

      const [token, refreshToken] = await createTokens(
        user,
        SECRET,
        refreshSecret
      );
      return {
        ok: true,
        token,
        refreshToken,
        user
      };
    } catch (err) {
      return {
        ok: false,
        error: err
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

    //Change the given hash to improve security
    const start = _.random(3, 8);
    const newHash = await emailExists.dataValues.password
      .replace("/", 2)
      .substr(start);

    models.User.update({ password: newHash }, { where: { email } });

    try {
      mailjet(email, newHash);
      //Exchange this for a new solution when a proper mailjet template exists
      models.User.update({ userstatus: "toverify" }, { where: { email } });

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
  }
};
