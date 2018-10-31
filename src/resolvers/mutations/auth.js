import bcrypt from "bcrypt";
import axios from "axios";
import { decode } from "jsonwebtoken";
import {
  createTokens,
  checkAuthentification,
  getNewPasswordData
} from "../../helpers/auth";
import { requiresAuth } from "../../helpers/permissions";
import {
  parentAdminCheck,
  createLog,
  computePasswordScore,
  formatHumanName,
  checkVat
} from "../../helpers/functions";
import { AuthError, NormalError } from "../../errors";
import { MAX_PASSWORD_LENGTH } from "../../constants";
import { sendEmail } from "../../helpers/email";
import { randomPassword } from "../../helpers/passwordgen";

export default {
  signUp: async (
    parent,
    { email, name, companyData },
    { models, SECRET, SECRET_TWO, ip }
  ) =>
    models.sequelize.transaction(async ta => {
      try {
        // Check whether the email is already in use
        const emailInUse = await models.Email.findOne({
          where: { email }
        });
        if (emailInUse) {
          throw new Error("Email already in use!");
        }

        // generate a new random password
        const password = await randomPassword(3, 2);
        const pwData = await getNewPasswordData(password);

        const unit = await models.Unit.create({}, { transaction: ta });
        const p1 = models.Human.create(
          {
            ...name,
            unitid: unit.id,
            firstlogin: false,
            needspasswordchange: true,
            ...pwData
          },
          { transaction: ta }
        );
        // delete verified: true
        const p2 = models.Email.create(
          { email, unitid: unit.id, verified: true, tags: ["billing"] },
          { transaction: ta }
        );

        const [newUser, emailDbo] = await Promise.all([p1, p2]);
        const user = newUser.get();

        await sendEmail({
          templateId: "d-c9632d3eaac94c9d82ca6b77f11ab5dc",
          fromName: "VIPFY",
          personalizations: [
            {
              to: [
                {
                  email,
                  name: `${name.firstname} ${
                    name.middlename ? `${name.middlename} ` : ""
                  }${name.lastname}`
                }
              ],
              dynamic_template_data: {
                name: "",
                password,
                email
              }
            }
          ]
        });

        let { legalinformation, name: companyName } = companyData;

        if (!legalinformation.noVatRequired) {
          const { vatId } = legalinformation;
          const vatNumber = vatId.substr(2).trim();
          const cc = vatId.substr(0, 2).toUpperCase();

          if (cc != "DE") {
            const checkedName = await checkVat(cc, vatNumber);
            const res = await axios.get("https://euvat.ga/rates.json");
            companyName = checkedName;
            legalinformation.vatPercentage = res.data.rates[cc].standard_rate;
          }
        }

        let company = await models.Unit.create({}, { transaction: ta });
        company = company.get();

        const p3 = models.Right.create(
          { holder: unit.id, forunit: company.id, type: "admin" },
          { transaction: ta }
        );

        const p4 = models.DepartmentData.create(
          { unitid: company.id, name: companyName, legalinformation },
          { transaction: ta }
        );

        const p5 = models.ParentUnit.create(
          { parentunit: company.id, childunit: unit.id },
          { transaction: ta }
        );

        let [rights, department, parentUnit] = await Promise.all([p3, p4, p5]);
        rights = rights.get();
        department = department.get();
        parentUnit = parentUnit.get();

        // resetCompanyMembershipCache(company.id, unit.id);

        await createLog(
          ip,
          "signUp",
          {
            human: user,
            email: emailDbo,
            rights,
            department,
            parentUnit,
            company
          },
          unit.id,
          ta
        );

        user.company = company.id;

        const refreshSecret = pwData.passwordhash + SECRET_TWO;
        const [token, refreshToken] = await createTokens(
          user,
          SECRET,
          refreshSecret
        );

        return { ok: true, token, refreshToken };
      } catch (err) {
        throw new AuthError({ message: err.message, internalData: { err } });
      }
    }),

  signUpConfirm: async (
    parent,
    { email, password },
    { models, SECRET, SECRET_TWO, ip }
  ) => {
    if (password.length > MAX_PASSWORD_LENGTH) {
      throw new Error("Password too long");
    }
    const emailExists = await models.Email.findOne({ where: { email } });
    if (!emailExists) throw new Error("Email not found!");

    const isVerified = await models.Email.findOne({
      where: { email, verified: true }
    });
    if (isVerified) throw new Error("User already verified!");

    return models.sequelize.transaction(async ta => {
      try {
        const p1 = await getNewPasswordData(password);
        const p2 = models.Human.findOne({
          where: { unitid: emailExists.unitid }
        });
        const [pwData, user] = await Promise.all([p1, p2]);

        const p3 = models.Human.update(
          {
            ...pwData
          },
          { where: { unitid: user.unitid }, transaction: ta, raw: true }
        );

        const p4 = models.Email.update(
          { verified: true },
          { where: { email }, raw: true, transaction: ta }
        );

        const p5 = createLog(
          ip,
          "signUpConfirm",
          { user, email },
          user.unitid,
          ta
        );

        await Promise.all([p3, p4, p5]);

        const refreshSecret = pwData.passwordhash + SECRET_TWO;
        const [token, refreshToken] = await createTokens(
          user,
          SECRET,
          refreshSecret
        );

        return {
          ok: true,
          token,
          refreshToken
        };
      } catch (err) {
        throw new AuthError({
          message: "Couldn't activate user!",
          internalData: { err }
        });
      }
    });
  },

  signIn: async (
    parent,
    { email, password },
    { models, SECRET, SECRET_TWO, ip }
  ) => {
    try {
      if (password.length > MAX_PASSWORD_LENGTH) {
        throw new Error("Password too long");
      }
      const message = "Email or Password incorrect!";

      const emailExists = await models.Login.findOne({
        where: { email },
        raw: true
      });

      if (!emailExists) throw new Error(message);

      const valid = await bcrypt.compare(password, emailExists.passwordhash);
      if (!valid) throw new Error(message);

      checkAuthentification(models, emailExists.unitid, emailExists.company);

      // update password length and strength.
      // This is temporary to fill values we didn't catch before implementing these metrics
      const passwordstrength = computePasswordScore(password);
      await models.Human.update(
        { passwordstrength, passwordlength: password.length },
        { where: { unitid: emailExists.unitid } }
      );

      const refreshTokenSecret = emailExists.passwordhash + SECRET_TWO;

      const p1 = models.User.findOne({
        where: { id: emailExists.unitid }
      });
      const p2 = createLog(
        ip,
        "signIn",
        { user: emailExists, email },
        emailExists.unitid,
        null
      );

      const [basicUser] = await Promise.all([p1, p2]);

      const user = await parentAdminCheck(basicUser);
      // User doesn't have the property unitid, so we have to pass emailExists for
      // the token creation
      const [token, refreshToken] = await createTokens(
        emailExists,
        SECRET,
        refreshTokenSecret
      );

      return { ok: true, user, token, refreshToken };
    } catch (err) {
      throw new AuthError({ message: err.message, internalData: { err } });
    }
  },

  changePassword: requiresAuth.createResolver(
    async (
      parent,
      { pw, newPw, confirmPw },
      { models, token, SECRET, SECRET_TWO, ip }
    ) =>
      models.sequelize.transaction(async ta => {
        try {
          if (newPw != confirmPw) throw new Error("New passwords don't match!");
          if (pw == newPw) {
            throw new Error("Current and new password can't be the same one!");
          }
          if (
            pw.length > MAX_PASSWORD_LENGTH ||
            newPw.length > MAX_PASSWORD_LENGTH
          ) {
            throw new Error("password too long");
          }

          const {
            user: { unitid }
          } = await decode(token);

          const findOldPassword = await models.Login.findOne({
            where: { unitid },
            raw: true
          });

          if (!findOldPassword) throw new Error("No database entry found!");

          const valid = await bcrypt.compare(pw, findOldPassword.passwordhash);

          if (!valid) throw new Error("Incorrect old password!");
          const pwData = await getNewPasswordData(newPw);

          const p1 = models.Human.update(
            {
              needspasswordchange: false,
              ...pwData
            },
            { where: { unitid }, returning: true, transaction: ta }
          );
          const p2 = models.User.findOne({ where: { id: unitid }, raw: true });

          const [updatedUser, basicUser] = await Promise.all([p1, p2]);
          await createLog(
            ip,
            "changePassword",
            { updatedUser: updatedUser[1], oldUser: findOldPassword },
            unitid,
            ta
          );

          const refreshTokenSecret = pwData.passwordhash + SECRET_TWO;
          const user = await parentAdminCheck(basicUser);
          findOldPassword.company = user.company;
          const [newToken, refreshToken] = await createTokens(
            findOldPassword,
            SECRET,
            refreshTokenSecret
          );

          return { ok: true, user, token: newToken, refreshToken };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  agreeTos: requiresAuth.createResolver(
    async (parent, args, { models, token, ip }) =>
      models.sequelize.transaction(async ta => {
        try {
          const {
            user: { unitid }
          } = await decode(token);

          const updatedUser = await models.Human.update(
            { firstlogin: false },
            { where: { unitid }, returning: true, transaction: ta }
          );

          await createLog(
            ip,
            "agreeTos",
            { updatedUser: updatedUser[1] },
            unitid,
            ta
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  ),

  forgotPassword: async (parent, { email }, { models, ip }) =>
    models.sequelize.transaction(async ta => {
      try {
        const emailExists = await models.Login.findOne({
          where: { email },
          raw: true
        });

        if (!emailExists) throw new Error("Email or Password incorrect!");
        if (emailExists.verified == false) {
          throw new Error("Sorry, this email isn't verified yet.");
        }

        if (emailExists.banned == true) {
          throw new Error("Sorry, this account is banned!");
        }

        if (emailExists.suspended == true) {
          throw new Error("Sorry, this account is suspended!");
        }

        const user = await models.Human.findOne({
          where: { unitid: emailExists.unitid },
          raw: true
        });

        // generate a new random password
        const newPw = await randomPassword(3, 2);
        const pwData = await getNewPasswordData(newPw);

        const updatedHuman = await models.Human.update(
          { ...pwData, needspasswordchange: true },
          { where: { unitid: user.unitid }, returning: true, transaction: ta }
        );

        await createLog(
          ip,
          "forgotPassword",
          { updatedHuman: updatedHuman[1], oldUser: user },
          emailExists.unitid,
          ta
        );

        await sendEmail({
          templateId: "d-9d74fbd6021449fcb59109bd8000a683",
          fromName: "VIPFY",
          personalizations: [
            {
              to: [
                {
                  email,
                  name: formatHumanName(user)
                }
              ],
              dynamic_template_data: {
                name: formatHumanName(user),
                password: newPw,
                email
              }
            }
          ]
        });

        return {
          ok: true,
          email
        };
      } catch (err) {
        throw new AuthError({ message: err.message, internalData: { err } });
      }
    })
};
