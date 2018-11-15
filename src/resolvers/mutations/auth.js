import bcrypt from "bcrypt";
import axios from "axios";
import moment from "moment";
import { decode } from "jsonwebtoken";
import { sleep } from "@vipfy-private/service-base";
import {
  createToken,
  checkAuthentification,
  getNewPasswordData
} from "../../helpers/auth";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
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
import { checkCompanyMembership } from "../../helpers/companyMembership";
import logger from "../../loggers";

const ZENDESK_TOKEN =
  "Basic bnZAdmlwZnkuc3RvcmUvdG9rZW46bndGc3lDVWFpMUg2SWNKOXBpbFk3UGRtOHk0bXVhamZlYzFrbzBHeQ==";

export default {
  signUp: async (
    parent,
    { email, name, companyData },
    { models, SECRET, ip }
  ) =>
    models.sequelize.transaction(async ta => {
      try {
        // Check whether the email is already in use
        const emailInUse = await models.Email.findOne({
          where: { email },
          raw: true
        });

        if (emailInUse) {
          throw new Error("Email already in use!");
        }
        // generate a new random password
        const password = await randomPassword(3, 2);
        const pwData = await getNewPasswordData(password);

        // Replace special characters in names to avoid frontend errors
        const filteredName = name;
        // Object.keys(name).forEach(item => {
        //   filteredName[item] = name[item].replace(
        //     /['"[\]{}()*+?.,\\^$|#\s]/g,
        //     "\\$&"
        //   );
        // });

        const unit = await models.Unit.create({}, { transaction: ta });
        const p1 = models.Human.create(
          {
            ...filteredName,
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

        const zendeskdata = await axios({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: ZENDESK_TOKEN
          },
          data: JSON.stringify({
            organization: { name: `Company-${company.id}`, notes: companyName }
          }),
          url: "https://vipfy.zendesk.com/api/v2/organizations.json"
        });

        sleep(300);

        await axios({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: ZENDESK_TOKEN
          },
          data: JSON.stringify({
            user: {
              name: formatHumanName(filteredName),
              email, // TODO Mehrere Email-Adressen
              verified: true,
              organization_id: zendeskdata.data.organization.id,
              external_id: `User-${unit.id}`
            }
          }),
          url: "https://vipfy.zendesk.com/api/v2/users/create_or_update.json"
        });

        const p3 = models.Right.create(
          { holder: unit.id, forunit: company.id, type: "admin" },
          { transaction: ta }
        );

        const p4 = models.DepartmentData.create(
          {
            unitid: company.id,
            name: companyName,
            legalinformation
          },
          { transaction: ta }
        );

        const p5 = models.ParentUnit.create(
          { parentunit: company.id, childunit: unit.id },
          { transaction: ta }
        );

        const endtime = moment()
          .add(1, "months")
          .toDate();

        const p6 = models.BoughtPlan.create(
          {
            planid: 126,
            payer: company.id,
            usedby: company.id,
            buyer: unit.id,
            totalprice: 0,
            disabled: false,
            endtime
          },
          { transaction: ta }
        );

        const [rights, department, parentUnit, vipfyPlan] = await Promise.all([
          p3,
          p4,
          p5,
          p6
        ]);
        // resetCompanyMembershipCache(company.id, unit.id);

        await sendEmail({
          templateId: "d-c9632d3eaac94c9d82ca6b77f11ab5dc",
          fromName: "VIPFY",
          personalizations: [
            {
              to: [
                {
                  email,
                  name: formatHumanName(filteredName)
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

        await createLog(
          ip,
          "signUp",
          {
            human: user,
            email: emailDbo,
            rights,
            department,
            parentUnit,
            vipfyPlan,
            company
          },
          unit.id,
          ta
        );

        user.company = company.id;

        const token = await createToken(user, SECRET);

        return { ok: true, token };
      } catch (err) {
        logger.info(err);
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }),

  signUpConfirm: async (
    parent,
    { email, password },
    { models, SECRET, ip }
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

        const supportUserArray = await axios({
          method: "GET",
          url: `https://vipfy.zendesk.com/api/v2/users/show_many.json?external_ids=User-${
            user.unitid
          }`,
          headers: {
            Authorization: ZENDESK_TOKEN
          }
        });

        logger.info("supportUserArray", supportUserArray);

        await axios({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: ZENDESK_TOKEN
          },
          data: JSON.stringify({
            password: "newpassword"
          }),
          url: `https://vipfy.zendesk.com/api/v2/users/${
            supportUserArray.users[0].user_id
          }/password.json`
        });

        const p5 = createLog(
          ip,
          "signUpConfirm",
          { user, email },
          user.unitid,
          ta
        );

        await Promise.all([p3, p4, p5]);

        const token = await createToken(user, SECRET);

        return { ok: true, token };
      } catch (err) {
        throw new AuthError({
          message: "Couldn't activate user!",
          internalData: { err }
        });
      }
    });
  },

  signIn: async (parent, { email, password }, { models, SECRET, ip }) => {
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
      const token = await createToken(emailExists, SECRET);

      return { ok: true, user, token };
    } catch (err) {
      throw new AuthError({ message: err.message, internalData: { err } });
    }
  },

  changePassword: requiresAuth.createResolver(
    async (parent, { pw, newPw, confirmPw }, { models, token, SECRET, ip }) =>
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

          const user = await parentAdminCheck(basicUser);
          findOldPassword.company = user.company;
          const newToken = await createToken(findOldPassword, SECRET);

          return { ok: true, user, token: newToken };
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
    }),

  forcePasswordChange: requiresRights(["view-security"]).createResolver(
    async (parent, { userids }, { models, token, ip }) =>
      models.sequelize.transaction(async transaction => {
        try {
          const {
            user: { unitid, company }
          } = await decode(token);

          // check that user has rights
          const checks = [];
          for (const userid of userids) {
            checks.push(
              checkCompanyMembership(models, company, userid, "department")
            );
          }
          await Promise.all(checks);

          // execute
          await models.Human.update(
            { needspasswordchange: true },
            {
              where: { unitid: { [models.Op.in]: userids } },
              transaction
            }
          );

          // log (not logging new/old human objects because of GDPR, change is trivial anyway)
          await createLog(
            ip,
            "forcePasswordChange",
            { units: userids },
            unitid,
            transaction
          );

          return { ok: true };
        } catch (err) {
          throw new NormalError({
            message: err.message,
            internalData: { err }
          });
        }
      })
  )
};
