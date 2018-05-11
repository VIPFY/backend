import { random } from "lodash";
import bcrypt from "bcrypt";
import { decode } from "jsonwebtoken";
import { createTokens } from "../../services/auth";
import { sendEmail } from "../../services/mailjet";
import { requiresAuth } from "../../helpers/permissions";
import { createPassword, parentAdminCheck } from "../../helpers/functions";

export default {
  signUp: async (parent, { email, newsletter }, { models, SECRET, SECRETTWO }) => {
    // Check whether the email is already in use
    const emailInUse = await models.Email.findOne({ where: { email } });
    if (emailInUse) {
      throw new Error("Email already in use!");
    } else {
      return models.sequelize.transaction(async ta => {
        try {
          const passwordhash = await createPassword(email);

          const unit = await models.Unit.create({}, { transaction: ta });
          const p1 = models.Human.create({ unitid: unit.id, passwordhash }, { transaction: ta });
          const p2 = models.Email.create({ email, unitid: unit.id }, { transaction: ta });
          const [user, emailAddress] = await Promise.all([p1, p2]);

          if (newsletter) {
            models.Newsletter.create({ email: emailAddress.email }, { transaction: ta });
          }

          // Don't send emails when testing the database!
          if (process.env.ENVIRONMENT != "testing") {
            sendEmail(email, passwordhash);
          }
          const refreshSecret = user.passwordhash + SECRETTWO;
          const [token, refreshToken] = await createTokens(user, SECRET, refreshSecret);
          return {
            ok: true,
            token,
            refreshToken
          };
        } catch ({ message }) {
          throw new Error(message);
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
        const p2 = models.Human.findOne({ where: { unitid: emailExists.unitid } });
        const [pw, user] = await Promise.all([p1, p2]);

        const p3 = models.Human.update(
          { passwordhash: pw },
          { where: { unitid: user.unitid }, transaction: ta }
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

  signIn: async (parent, { email, password }, { models, SECRET, SECRETTWO }) => {
    const error = "Email or Password incorrect!";
    const emailExists = await models.Login.findOne({ where: { email }, raw: true });
    if (!emailExists) throw new Error(error);
    if (emailExists.verified == false) throw new Error("Sorry, this email isn't verified yet.");
    if (emailExists.banned == true) throw new Error("Sorry, this account is banned!");
    if (emailExists.suspended == true) throw new Error("Sorry, this account is suspended!");
    if (emailExists.deleted == true) throw new Error("Sorry, this account doesn't exist anymore.");

    const basicUser = await models.User.findOne({ where: { id: emailExists.unitid } });
    const valid = await bcrypt.compare(password, emailExists.passwordhash);
    if (!valid) throw new Error(error);

    const refreshTokenSecret = emailExists.passwordhash + SECRETTWO;
    const [token, refreshToken] = await createTokens(emailExists, SECRET, refreshTokenSecret);

    const user = parentAdminCheck(models, basicUser);

    return { ok: true, user, token, refreshToken };
  },

  changePassword: requiresAuth.createResolver(
    async (parent, { pw, newPw, confirmPw }, { models, token, SECRET, SECRETTWO }) => {
      try {
        if (newPw != confirmPw) throw new Error("New passwords don't match!");
        if (pw == newPw) throw new Error("Current and new password can't be the same one!");

        const { user: { unitid } } = await decode(token);
        const findOldPassword = await models.Login.findOne({
          where: {
            unitid,
            verified: true,
            banned: false,
            deleted: false,
            suspended: false
          }
        });
        if (!findOldPassword) throw new Error("No database entry found!");

        const valid = await bcrypt.compare(pw, findOldPassword.passwordhash);
        if (!valid) throw new Error("Incorrect old password!");
        const passwordhash = await bcrypt.hash(newPw, 12);

        await models.Human.update({ passwordhash }, { where: { unitid } });
        const basicUser = await models.User.findById(unitid);

        const refreshTokenSecret = basicUser.passwordhash + SECRETTWO;
        const [newToken, refreshToken] = await createTokens(basicUser, SECRET, refreshTokenSecret);

        const user = parentAdminCheck(models, basicUser);

        return { ok: true, user, token: newToken, refreshToken };
      } catch (err) {
        throw new Error(err.message);
      }
    }
  ),

  forgotPassword: async (parent, { email }, { models }) => {
    const emailExists = await models.Login.findOne({ where: { email } });
    if (!emailExists) throw new Error("Email doesn't exist!");
    if (emailExists.banned == true) throw new Error("Sorry, this account is banned!");
    if (emailExists.suspended == true) throw new Error("Sorry, this account is suspended!");
    if (emailExists.deleted == true) throw new Error("Sorry, this account doesn't exist anymore.");

    try {
      const user = await models.Human.findOne({ where: { unitid: emailExists.unitid } });
      // Change the given hash to improve security
      const start = random(3, 8);
      const newHash = await user.dataValues.passwordhash.replace("/", 2).substr(start);

      await models.Human.update({ passwordhash: newHash }, { where: { unitid: user.unitid } });

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
