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
  checkVat,
  parseAddress
} from "../../helpers/functions";
import { googleMapsClient } from "../../services/gcloud";
import { AuthError, NormalError } from "../../errors";
import { MAX_PASSWORD_LENGTH } from "../../constants";
import { sendEmail } from "../../helpers/email";
import { randomPassword } from "../../helpers/passwordgen";
import { checkCompanyMembership } from "../../helpers/companyMembership";
import logger from "../../loggers";
import { debug } from "util";
import { parseName } from "humanparser";

const ZENDESK_TOKEN =
  "Basic bnZAdmlwZnkuc3RvcmUvdG9rZW46bndGc3lDVWFpMUg2SWNKOXBpbFk3UGRtOHk0bXVhamZlYzFrbzBHeQ==";

export default {
  signUp: async (
    parent,
    { email, companyname: name, privacy, termsOfService },
    { models, SECRET, ip }
  ) =>
    models.sequelize.transaction(async ta => {
      try {
        if (!privacy || !termsOfService) {
          throw new Error(
            "You have to confirm to our privacy agreement and our Terms of Service!"
          );
        }
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
        // const filteredName = name;
        // Object.keys(name).forEach(item => {
        //   filteredName[item] = name[item].replace(
        //     /['"[\]{}()*+?.,\\^$|#\s]/g,
        //     "\\$&"
        //   );
        // });
        const unit = await models.Unit.create({}, { transaction: ta });
        const p1 = models.Human.create(
          {
            unitid: unit.id,
            firstlogin: false,
            needspasswordchange: true,
            ...pwData
          },
          { transaction: ta }
        );

        const p2 = models.Email.create(
          { email, unitid: unit.id, tags: ["billing"] },
          { transaction: ta }
        );

        const [newUser, emailDbo] = await Promise.all([p1, p2]);
        const user = newUser.get();

        let company = await models.Unit.create({}, { transaction: ta });
        company = company.get();

        const zendeskdata = await axios({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: ZENDESK_TOKEN
          },
          data: JSON.stringify({
            organization: { name: `Company-${company.id}`, notes: name }
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
              name: "User",
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
            name,
            legalinformation: {
              privacy: new Date(),
              termsOfService: new Date()
            }
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

        await sendEmail({
          templateId: "d-c9632d3eaac94c9d82ca6b77f11ab5dc",
          fromName: "VIPFY",
          personalizations: [
            {
              to: [
                {
                  email,
                  name: "User"
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

  setupFinished: async (
    parent,
    { country, vatoption, vatnumber, placeId, ownAdress, username },
    { models, SECRET, ip, token }
  ) =>
    models.sequelize.transaction(async ta => {
      console.log(
        "PROPS",
        country,
        vatoption,
        vatnumber,
        placeId,
        ownAdress,
        username
      );
      try {
        const {
          user: { unitid, company }
        } = decode(token);

        let p1;
        if (username) {
          const name = parseName(username);
          p1 = models.Human.update(
            {
              title: name.salutation || "",
              firstname: name.firstName || "",
              middlename: name.middleName || "",
              lastname: name.lastName || "",
              suffix: name.suffix || "",
              firstlogin: false,
              statisticdata: {
                username
              }
            },
            { where: { unitid }, transaction: ta, raw: true }
          );
        } else {
          p1 = models.Human.update(
            {
              firstlogin: false
            },
            { where: { unitid }, transaction: ta, raw: true }
          );
        }

        if (placeId && placeId !== "OWN") {
          const { json } = await googleMapsClient
            .place({
              placeid: placeId,
              fields: [
                "formatted_address",
                "international_phone_number",
                "website",
                "address_component"
              ]
            })
            .asPromise();
          const addressData = parseAddress(json.result.address_components);

          await models.Address.create(
            {
              ...addressData,
              unitid: company,
              tags: ["main"]
            },
            { transaction: ta }
          );
        }

        const p2 = models.DepartmentData.update(
          {
            setupfinished: true,
            statisticdata: {
              placeId,
              ownAdress,
              vatoption,
              vatnumber,
              country
            }
          },
          { where: { unitid: company }, transaction: ta }
        );
        await Promise.all([p1, p2]);

        return { ok: true };
      } catch (err) {
        logger.info(err);
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }),

  signUpConfirm: async (
    parent,
    { token, password, passwordConfirm, email },
    { models, ip }
  ) =>
    models.sequelize.transaction(async ta => {
      if (password != passwordConfirm) {
        throw new Error("New passwords don't match!");
      }

      if (password.length > MAX_PASSWORD_LENGTH) {
        throw new Error("Password too long");
      }

      try {
        const promises = [
          models.Token.findOne({
            where: {
              email,
              token,
              expiresat: {
                [models.Op.gt]: models.sequelize.fn("NOW")
              }
            },
            raw: true
          })
        ];

        promises.push(
          models.Email.findOne({
            where: { email },
            autogenerated: false,
            verified: false,
            raw: true
          })
        );

        const [tokenExists, { unitid }] = await Promise.all(promises);

        if (!tokenExists) {
          throw new Error("Token not found!");
        }

        if (!unitid) {
          throw new Error("No valid email found!");
        }

        const pwData = await getNewPasswordData(password);

        const p1 = models.Human.update(
          {
            ...pwData
          },
          { where: { unitid }, transaction: ta }
        );

        const p2 = models.Email.update(
          { verified: true },
          { where: { email, unitid }, transaction: ta }
        );

        const p3 = models.Token.update(
          { usedat: Date.now() },
          { where: { id: tokenExists.id } }
        );

        const p4 = createLog(ip, "signUpConfirm", { token, email }, unitid, ta);

        await Promise.all([p1, p2, p3, p4]);

        return true;
      } catch (err) {
        throw new AuthError({
          message: "Couldn't activate user!",
          internalData: { err }
        });
      }
    }),

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

      await checkAuthentification(
        models,
        emailExists.unitid,
        emailExists.company
      );

      // update password length and strength.
      // This is temporary to fill values we didn't catch before implementing these metrics
      const passwordstrength = computePasswordScore(password);
      await models.Human.update(
        { passwordstrength, passwordlength: password.length },
        { where: { unitid: emailExists.unitid } }
      );

      await createLog(
        ip,
        "signIn",
        { user: emailExists, email },
        emailExists.unitid,
        null
      );

      // User doesn't have the property unitid, so we have to pass emailExists for
      // the token creation
      const token = await createToken(emailExists, SECRET);

      return { ok: true, token };
    } catch (err) {
      throw new Error({ message: err.message, internalData: { err } });
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
            throw new Error("Password too long");
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

          // todo: simpler way to get company, since we don't return user anymore
          const user = await parentAdminCheck(basicUser);
          findOldPassword.company = user.company;
          const newToken = await createToken(findOldPassword, SECRET);

          return { ok: true, token: newToken };
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
  ),

  redeemSetupToken: async (parent, { setuptoken }, { models, ip, SECRET }) => {
    try {
      const setupTokenEntry = await models.SetupToken.findOne({
        where: {
          key: setuptoken,
          validuntil: { [models.Op.gt]: models.sequelize.fn("NOW") }
        }
      });
      if (!setupTokenEntry) {
        throw new Error("token invalid");
      }

      const emailExists = await models.Login.findOne({
        where: { unitid: setupTokenEntry.unitid },
        raw: true
      });

      if (!emailExists) throw new Error("user not found");

      await checkAuthentification(
        models,
        emailExists.unitid,
        emailExists.company
      );

      await createLog(
        ip,
        "redeemSetupToken",
        { user: emailExists, setuptoken },
        emailExists.unitid,
        null
      );

      const token = await createToken(emailExists, SECRET, "1d");

      return { ok: true, token };
    } catch (err) {
      throw new NormalError({
        message: err.message,
        internalData: { err }
      });
    }
  }
};
