import { random } from "lodash";
import bcrypt from "bcrypt";
import { createTokens } from "../../services/auth";
import { sendEmail } from "../../services/mailjet";
import { createPassword } from "../../helpers/functions";

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
        const p2 = models.Human.findById(emailExists.unitid);
        const [pw, user] = await Promise.all([p1, p2]);

        const p3 = models.Human.update(
          { passwordhash: pw },
          { where: { unitid: user.id }, transaction: ta }
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
    const emailExists = await models.Login.findOne({ where: { email }, raw: true });
    if (!emailExists) throw new Error("Sorry, but we couldn't find your email.");
    if (emailExists.verified == false) throw new Error("Sorry, this email isn't verified yet.");
    if (emailExists.banned == true) throw new Error("Sorry, this account is banned!");
    if (emailExists.suspended == true) throw new Error("Sorry, this account is suspended!");
    if (emailExists.deleted == true) throw new Error("Sorry, this account doesn't exist anymore.");

    const user = await models.User.findOne({ where: { id: emailExists.unitid } });
    const valid = await bcrypt.compare(password, emailExists.passwordhash);
    if (!valid) throw new Error("Incorrect Password!");

    const refreshTokenSecret = emailExists.passwordhash + SECRETTWO;
    const [token, refreshToken] = await createTokens(emailExists, SECRET, refreshTokenSecret);

    return {
      ok: true,
      user,
      token,
      refreshToken
    };
  },

  forgotPassword: async (parent, { email }, { models }) => {
    const emailExists = await models.Login.findOne({ where: { email } });
    if (!emailExists) throw new Error("Email doesn't exist!");
    if (emailExists.banned == true) throw new Error("Sorry, this account is banned!");
    if (emailExists.suspended == true) throw new Error("Sorry, this account is suspended!");
    if (emailExists.deleted == true) throw new Error("Sorry, this account doesn't exist anymore.");

    try {
      const user = await models.Human.findById(emailExists.unitid);
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
