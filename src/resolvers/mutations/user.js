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
    return models.Human.update({ firstname: newFirstName }, { where: { id } });
  }),

  deleteUser: requiresAuth.createResolver(async (parent, args, { models, token }) => {
    const { user: { id } } = jwt.decode(token);

    await models.Human.destroy({ where: { id } });
    return "User was deleted";
  }),

  signUp: async (parent, { email, newsletter }, { models, SECRET, SECRETTWO }) => {
    // Check whether the email is already in use
    const emailInUse = await models.Email.findOne({ where: { email } });
    if (emailInUse) {
      throw new Error("Email already in use!");
    } else {
      return models.sequelize.transaction(async ta => {
        try {
          // A password musst be created because otherwise the not null rule of the
          // database is violated
          const passwordHash = await bcrypt.hash(email, 5);

          // Change the given hash to improve security
          const start = random(3, 8);
          const newHash = await passwordHash.replace("/", 2).substr(start);

          const unit = await models.Unit.create({}, { transaction: ta });
          const user = await models.Human.create({ passwordhash: newHash }, { transaction: ta });

          const p1 = models.HumanUnit.create(
            { unitid: unit.id, humanid: user.id },
            { transaction: ta }
          );
          const p2 = models.Email.create({ email, unitid: unit.id }, { transaction: ta });
          const [human, emailAddress] = await Promise.all([p1, p2]);

          if (newsletter) {
            models.Newsletter.create({ email: emailAddress.email }, { transaction: ta });
          }

          // Don't send emails when testing the database!
          if (process.env.ENVIRONMENT != "testing") {
            sendEmail(email, newHash);
          }
          const refreshSecret = user.passwordhash + SECRETTWO;
          const [token, refreshToken] = await createTokens(user, SECRET, refreshSecret);
          return {
            ok: true,
            token,
            refreshToken
          };
        } catch (err) {
          throw new Error(err.message);
        }
      });
    }
  },

  signUpConfirm: async (parent, { email, password }, { models, SECRET, SECRETTWO }) => {
    const emailExists = await models.Email.findOne({ where: { email } });
    if (!emailExists) throw new Error("Email not found!");

    const isVerified = await models.Email.findOne({
      where: { email, verified: true }
    });
    if (isVerified) throw new Error("User already verified!");

    return models.sequelize.transaction(async ta => {
      try {
        const p1 = bcrypt.hash(password, 12);
        const p2 = models.HumanUnit.findOne({ where: { unitid: emailExists.unitid } });
        const [pw, user] = await Promise.all([p1, p2]);

        const p3 = models.Human.update(
          { passwordhash: pw },
          { where: { id: user.humanid }, transaction: ta }
        );
        const p4 = models.Email.update({ verified: true }, { where: { email }, transaction: ta });
        await Promise.all([p3, p4]);

        const refreshSecret = pw + SECRETTWO;
        const [token, refreshToken] = await createTokens(user, SECRET, refreshSecret);

        return {
          ok: true,
          token,
          refreshToken
        };
      } catch (err) {
        throw new Error("Couldn't activate user!");
      }
    });
  },

  signIn: (parent, { email, password }, { models, SECRET, SECRETTWO }) =>
    tryLogin(email, password, models, SECRET, SECRETTWO),

  forgotPassword: async (parent, { email }, { models }) => {
    const emailExists = await models.User.findOne({ where: { email } });
    if (!emailExists) throw new Error("Email doesn't exist!");

    try {
      const user = await models.Human.findOne({ where: { id: emailExists.id } });
      // Change the given hash to improve security
      const start = random(3, 8);
      const newHash = await user.dataValues.passwordhash.replace("/", 2).substr(start);

      await models.Human.update({ passwordhash: newHash }, { where: { id: user.id } });

      // Don't send emails when testing the database!
      if (process.env.ENVIRONMENT != "testing") {
        sendEmail(email, newHash);
      }

      return {
        ok: true,
        email
      };
    } catch (err) {
      throw new Error(err.message);
    }
  }
};
