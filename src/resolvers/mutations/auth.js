import { random } from "lodash";
import bcrypt from "bcrypt";
import { decode } from "jsonwebtoken";
import { createTokens } from "../../helpers/auth";
import { sendRegistrationEmail } from "../../services/mailjet";
import { requiresAuth } from "../../helpers/permissions";
import { parentAdminCheck, createLog } from "../../helpers/functions";
import { AuthError } from "../../errors";

export default {
  signUp: async (parent, { email, newsletter }, { models, SECRET, SECRET_TWO }) =>
    models.sequelize.transaction(async ta => {
      try {
        // Check whether the email is already in use
        const emailInUse = await models.Email.findOne({ where: { email } });
        if (emailInUse) {
          throw new Error("Email already in use!");
        }

        // const passwordhash = await createPassword(email);
        const passwordhash = await bcrypt.hash("test", 12);

        const unit = await models.Unit.create({}, { transaction: ta });
        const p1 = models.Human.create(
          { unitid: unit.id, passwordhash, firstname: email },
          { transaction: ta }
        );
        // delete verified: true
        const p2 = models.Email.create(
          { email, unitid: unit.id, verified: true, tags: ["billing"] },
          { transaction: ta }
        );

        const [user] = await Promise.all([p1, p2]);

        if (newsletter) {
          await models.Newsletter.create({ email }, { transaction: ta });
        }

        // sendRegistrationEmail(email, passwordhash);

        const refreshSecret = user.passwordhash + SECRET_TWO;
        const [token, refreshToken] = await createTokens(user, SECRET, refreshSecret);

        return { ok: true, token, refreshToken };
      } catch (err) {
        throw new AuthError({ message: err.message, internalData: { err } });
      }
    }),

  signUpConfirm: async (parent, { email, password }, { models, SECRET, SECRET_TWO, ip }) => {
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
          { where: { unitid: user.unitid }, transaction: ta, raw: true }
        );

        const p4 = models.Email.update(
          { verified: true },
          { where: { email }, raw: true, transaction: ta }
        );

        const p5 = createLog(ip, "signUpConfirm", { user, email }, user.unitid, ta);

        await Promise.all([p3, p4, p5]);

        const refreshSecret = pw + SECRET_TWO;
        const [token, refreshToken] = await createTokens(user, SECRET, refreshSecret);

        return {
          ok: true,
          token,
          refreshToken
        };
      } catch (err) {
        throw new AuthError({ message: "Couldn't activate user!", internalData: { err } });
      }
    });
  },

  signIn: async (parent, { email, password }, { models, SECRET, SECRET_TWO, ip }) => {
    try {
      const message = "Email or Password incorrect!";
      const emailExists = await models.Login.findOne({ where: { email }, raw: true });

      if (!emailExists) throw new Error(message);
      if (emailExists.verified == false) throw new Error("Sorry, this email isn't verified yet.");
      if (emailExists.banned == true) throw new Error("Sorry, this account is banned!");
      if (emailExists.suspended == true) throw new Error("Sorry, this account is suspended!");
      if (emailExists.deleted == true) {
        throw new Error("Sorry, this account doesn't exist anymore.");
      }

      const basicUser = await models.User.findOne({ where: { id: emailExists.unitid } });
      const valid = await bcrypt.compare(password, emailExists.passwordhash);
      if (!valid) throw new Error(message);

      const refreshTokenSecret = emailExists.passwordhash + SECRET_TWO;
      const p1 = parentAdminCheck(basicUser);
      const p2 = createLog(ip, "signIn", { user: emailExists, email }, emailExists.unitid, null);

      const [user] = await Promise.all([p1, p2]);
      // User doesn't have the property unitid, so we have to pass emailExists for
      // the token creation
      emailExists.company = user.company;
      const [token, refreshToken] = await createTokens(emailExists, SECRET, refreshTokenSecret);

      return { ok: true, user, token, refreshToken };
    } catch (err) {
      throw new AuthError({ message: err.message, internalData: { err } });
    }
  },

  changePassword: requiresAuth.createResolver(
    async (parent, { pw, newPw, confirmPw }, { models, token, SECRET, SECRET_TWO, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          if (newPw != confirmPw) throw new Error("New passwords don't match!");
          if (pw == newPw) throw new Error("Current and new password can't be the same one!");

          const {
            user: { unitid }
          } = await decode(token);

          const findOldPassword = await models.Login.findOne({
            where: {
              unitid,
              verified: true,
              banned: false,
              deleted: false,
              suspended: false
            },
            raw: true
          });
          if (!findOldPassword) throw new Error("No database entry found!");

          const valid = await bcrypt.compare(pw, findOldPassword.passwordhash);
          if (!valid) throw new Error("Incorrect old password!");
          const passwordhash = await bcrypt.hash(newPw, 12);

          const p1 = models.Human.update(
            { passwordhash },
            { where: { unitid }, returning: true, transaction: ta }
          );
          const p2 = models.User.findById(unitid);

          const [updatedUser, basicUser] = await Promise.all([p1, p2]);
          await createLog(
            ip,
            "changePassword",
            { updatedUser: updatedUser[1], oldUser: findOldPassword },
            unitid,
            ta
          );

          const refreshTokenSecret = basicUser.passwordhash + SECRET_TWO;
          const user = await parentAdminCheck(basicUser);
          findOldPassword.company = user.company;

          const [newToken, refreshToken] = await createTokens(
            findOldPassword,
            SECRET,
            refreshTokenSecret
          );

          return { ok: true, user, token: newToken, refreshToken };
        } catch (err) {
          throw new AuthError({ message: err.message, internalData: { err } });
        }
      })
  ),

  forgotPassword: async (parent, { email }, { models, ip }) =>
    models.sequelize.transaction(async ta => {
      try {
        const emailExists = await models.Login.findOne({ where: { email }, raw: true });

        if (!emailExists) throw new Error("Email or Password incorrect!");
        if (emailExists.verified == false) throw new Error("Sorry, this email isn't verified yet.");
        if (emailExists.banned == true) throw new Error("Sorry, this account is banned!");
        if (emailExists.suspended == true) throw new Error("Sorry, this account is suspended!");

        const user = await models.Human.findOne({
          where: { unitid: emailExists.unitid },
          raw: true
        });

        // Change the given hash to improve security
        const start = random(3, 8);
        const newHash = await user.passwordhash.replace("/", 2).substr(start);

        const updatedHuman = await models.Human.update(
          { passwordhash: newHash },
          { where: { unitid: user.unitid }, returning: true, transaction: ta }
        );

        await createLog(
          ip,
          "forgotPassword",
          { updatedHuman: updatedHuman[1], oldUser: user },
          emailExists.unitid,
          ta
        );

        sendRegistrationEmail(email, newHash);

        return {
          ok: true,
          email
        };
      } catch (err) {
        throw new AuthError({ message: err.message, internalData: { err } });
      }
    })
};
