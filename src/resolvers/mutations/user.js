import { random } from "lodash";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { tryLogin, createTokens } from "../../services/auth";
import { requiresAuth } from "../../helpers/permissions";
import { sendEmail } from "../../services/mailjet";

/* eslint-disable no-unused-vars */

export default {
  updateUser: requiresAuth.createResolver((parent, { newFirstName }, { models, token }) => {
    const { user: { id } } = jwt.decode(token);
    return models.User.update({ firstname: newFirstName }, { where: { id } });
  }),

  deleteUser: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    const { user: { id } } = jwt.decode(token);

    await models.User.destroy({ where: { id } });
    return "User was deleted";
  }),

  signUp: async (parent, { email, newsletter }, { models, SECRET, SECRETTWO }) => {
    // Check whether the email is already in use
    const emailInUse = await models.User.findOne({ where: { email } });
    if (emailInUse) {
      throw new Error("Email already in use!");
    } else {
      try {
        // A password musst be created because otherwise the not null rule of the
        // database is violated
        const passwordHash = await bcrypt.hash(email, 5);

        // Change the given hash to improve security
        const start = random(3, 8);
        const newHash = await passwordHash.replace("/", 2).substr(start);

        const user = await models.User.create({
          email,
          newsletter,
          password: newHash
        });

        // Don't send emails when testing the database!
        if (process.env.ENVIRONMENT != "testing") {
          sendEmail(email, newHash);
        }
        const refreshSecret = user.password + SECRETTWO;
        const [token, refreshToken] = await createTokens(user, SECRET, refreshSecret);
        return {
          ok: true,
          token,
          refreshToken
        };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  },

  signUpConfirm: async (parent, { email, password }, { models, SECRET, SECRETTWO }) => {
    const emailExists = await models.User.findOne({ where: { email } });
    if (!emailExists) throw new Error("Email not found!");

    const isVerified = await models.User.findOne({
      where: { email, userstatus: "normal" }
    });
    if (isVerified) throw new Error("User already verified!");

    try {
      const passwordHash = await bcrypt.hash(password, 12);

      const activate = await models.User.update(
        { password: passwordHash, userstatus: "normal" },
        { where: { email } }
      );

      const refreshSecret = passwordHash + SECRETTWO;

      const [token, refreshToken] = await createTokens(isVerified, SECRET, refreshSecret);

      return {
        ok: true,
        token,
        refreshToken
      };
    } catch (err) {
      throw new Error("Couldn't activate user!");
    }
  },

  signIn: (parent, { email, password }, { models, SECRET, SECRETTWO }) =>
    tryLogin(email, password, models, SECRET, SECRETTWO),

  forgotPassword: async (parent, { email }, { models }) => {
    const emailExists = await models.User.findOne({ where: { email } });
    if (!emailExists) {
      throw new Error("Email doesn't exist!");
    }

    // Change the given hash to improve security
    const start = random(3, 8);
    const newHash = await emailExists.dataValues.password.replace("/", 2).substr(start);

    models.User.update({ password: newHash }, { where: { email } });

    try {
      // Don't send emails when testing the database!
      if (process.env.ENVIRONMENT != "testing") {
        sendEmail(email, newHash);
      }
      // Exchange this for a new solution when a proper mailjet template exists
      models.User.update({ userstatus: "toverify" }, { where: { email } });

      return {
        ok: true,
        email
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }
};
