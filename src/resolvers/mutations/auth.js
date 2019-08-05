import bcrypt from "bcrypt";
import axios from "axios";
import moment from "moment";
import { decode } from "jsonwebtoken";
import { sleep } from "@vipfy-private/service-base";
import { parseName } from "humanparser";
import {
  createToken,
  checkAuthentification,
  getNewPasswordData
} from "../../helpers/auth";
import { createToken as create2FAToken } from "../../helpers/token";
import { createToken as createSetupToken } from "../../helpers/token";
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
import { NormalError } from "../../errors";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../../constants";
import { sendEmail, emailRegex } from "../../helpers/email";
import { randomPassword } from "../../helpers/passwordgen";
import { checkCompanyMembership } from "../../helpers/companyMembership";
import logger from "../../loggers";

const ZENDESK_TOKEN =
  "Basic bnZAdmlwZnkuc3RvcmUvdG9rZW46bndGc3lDVWFpMUg2SWNKOXBpbFk3UGRtOHk0bXVhamZlYzFrbzBHeQ==";

export default {
  signUp: async (
    _p,
    { email, companyname: name, privacy, termsOfService, isprivate },
    ctx
  ) =>
    ctx.models.sequelize.transaction(async ta => {
      try {
        const { models, SECRET } = ctx;
        if (!privacy || !termsOfService) {
          throw new Error(
            "You have to confirm to our privacy agreement and our Terms of Service!"
          );
        }

        const isValid = email.match(emailRegex);

        if (!isValid) {
          throw new Error("This is not a valid email");
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
            needspasswordchange: false,
            consent: null,
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
            organization: {
              name: `Company-${company.id}-${createSetupToken()}`,
              notes: name
            }
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
              external_id: `User-${unit.id}-${createSetupToken()}`
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
            iscompany: true,
            isprivate,
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
          .add(2, "months")
          .toDate();

        const p6 = models.BoughtPlan.create(
          {
            planid: 126,
            alias: "Vipfy Standard",
            payer: company.id,
            usedby: company.id,
            buyer: unit.id,
            totalprice: 0,
            disabled: false,
            endtime
          },
          { transaction: ta }
        );

        const setupToken = await createSetupToken();
        const verifyToken = await createSetupToken();

        const p7 = models.Token.create(
          {
            email,
            token: setupToken,
            expiresat: moment()
              .add(4, "hour")
              .toISOString(),
            type: "setuplogin",
            data: { unitid: unit.id }
          },
          { transaction: ta }
        );

        const p8 = models.Token.create(
          {
            email,
            token: verifyToken,
            expiresat: moment()
              .add(1, "week")
              .toISOString(),
            type: "signUp"
          },
          { transaction: ta }
        );

        const [
          rights,
          department,
          parentUnit,
          vipfyPlan,
          setuptoken,
          verifytoken
        ] = await Promise.all([p3, p4, p5, p6, p7, p8]);

        const windowsLink = `https://download.vipfy.store/latest/win32/x64/VIPFY-${setupToken}.exe`;
        const macLink = `https://download.vipfy.store/latest/darwin/x64/VIPFY-${setupToken}.dmg`;

        const verifyLink = `https://vipfy.store/verify-email/${encodeURIComponent(
          email
        )}/${verifyToken}`;

        await sendEmail({
          templateId: "d-f05a3b4cf6f047e184e921b230ffb7ad",
          fromName: "VIPFY",
          personalizations: [
            {
              to: [{ email }],
              dynamic_template_data: {
                verifyLink
              }
            }
          ]
        });

        await createLog(
          ctx,
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
          ta
        );

        user.company = company.id;

        const token = await createToken(user, SECRET);

        return {
          ok: true,
          token,
          downloads: {
            win64: windowsLink,
            macOS: macLink
          }
        };
      } catch (err) {
        logger.info(err);
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }),

  setupFinished: async (
    _p,
    { country, vatoption, vatnumber, placeId, ownAdress, username },
    { models, token }
  ) =>
    models.sequelize.transaction(async ta => {
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

  signUpConfirm: async (_, { token, password, passwordConfirm, email }, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      const { models } = ctx;

      if (password != passwordConfirm) {
        throw new Error("Passwords don't match!");
      }

      if (password.length > MAX_PASSWORD_LENGTH) {
        throw new Error("Password too long!");
      }

      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters long!`
        );
      }

      try {
        const promises = [
          models.Token.findOne({
            where: {
              email,
              token,
              type: "signUp",
              expiresat: {
                [models.Op.gt]: models.sequelize.fn("NOW")
              }
            },
            raw: true
          }),
          models.Email.findOne({
            where: { email, autogenerated: false, verified: false },
            raw: true
          })
        ];

        const [tokenExists, { unitid }] = await Promise.all(promises);

        if (!tokenExists) {
          throw new Error("Token not found!");
        }

        if (!unitid) {
          throw new Error("No valid email found!");
        }

        const pwData = await getNewPasswordData(password);

        const p1 = models.Token.findOne({
          where: { type: "signUp", email },
          raw: true
        });

        const p2 = models.Email.update(
          { verified: true },
          { where: { email, unitid }, transaction: ta }
        );

        const p3 = models.Token.update(
          { usedat: new Date() },
          { where: { id: tokenExists.id }, transaction: ta }
        );

        const p4 = models.Human.update(
          {
            ...pwData
          },
          { where: { unitid }, transaction: ta }
        );

        const p5 = createLog(ctx, "signUpConfirm", { token, email }, ta);
        const [signUpToken] = await Promise.all([p1, p2, p3, p4, p5]);

        if (
          !signUpToken.usedat &&
          moment(signUpToken.expiresat).isAfter(moment())
        ) {
          return {
            download: {
              win64: `https://download.vipfy.store/latest/win32/x64/VIPFY-${
                signUpToken.token
              }.exe`,
              macOS: `https://download.vipfy.store/latest/darwin/x64/VIPFY-${
                signUpToken.token
              }.dmg`
            }
          };
        } else if (signUpToken.usedat) {
          return {
            download: {
              win64: `https://download.vipfy.store/latest/win32/x64/VIPFY.exe`,
              macOS: `https://download.vipfy.store/latest/darwin/x64/VIPFY.dmg`
            }
          };
        } else {
          throw new Error();
        }
      } catch (err) {
        throw new NormalError({
          message: "Couldn't activate user!",
          internalData: { err }
        });
      }
    }),

  signIn: async (_, { email, password }, ctx) => {
    try {
      if (password.length > MAX_PASSWORD_LENGTH) {
        throw new Error("Password too long");
      }

      const message = "Email or Password incorrect!";

      const [emailExists] = await ctx.models.Login.findAll({
        where: {
          email,
          deleted: { [ctx.models.Op.or]: [null, false] },
          banned: { [ctx.models.Op.or]: [null, false] },
          suspended: { [ctx.models.Op.or]: [null, false] }
        },
        raw: true
      });

      console.log("LOG: emailExists", emailExists);
      if (!emailExists) {
        throw new Error(message);
      }

      const valid = await bcrypt.compare(password, emailExists.passwordhash);
      if (!valid) throw new Error(message);

      await checkAuthentification(emailExists.unitid, emailExists.company);

      // update password length and strength.
      // This is temporary to fill values we didn't catch before implementing these metrics
      const passwordstrength = computePasswordScore(password);
      await ctx.models.Human.update(
        { passwordstrength, passwordlength: password.length },
        { where: { unitid: emailExists.unitid } }
      );

      if (emailExists.twofactor) {
        const { secret } = await ctx.models.TwoFA.findOne({
          where: { unitid: emailExists.unitid, type: emailExists.twofactor },
          raw: true
        });

        const token = await create2FAToken();

        await ctx.models.Token.create({
          email,
          token,
          data: { unitid: emailExists.unitid },
          expiresat: moment()
            .add(15, "minutes")
            .toISOString(),
          type: "2FAToken"
        });

        // One is needed for the logger function to work correctly
        const fakeToken = await createToken(emailExists, ctx.SECRET);
        ctx.token = fakeToken;
        await createLog(ctx, "signIn", { user: emailExists, email }, null);

        return {
          ok: true,
          twofactor: secret.otpauth_url,
          unitid: emailExists.unitid,
          token
        };
      } else {
        // User doesn't have the property unitid, so we have to pass emailExists for
        // the token creation
        const token = await createToken(emailExists, ctx.SECRET);
        ctx.token = token;
        await createLog(ctx, "signIn", { user: emailExists, email }, null);

        return { ok: true, token };
      }
    } catch (err) {
      logger.log(err);
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  changePassword: requiresAuth.createResolver(
    async (_, { pw, newPw, confirmPw }, { models, token, SECRET, ip }) =>
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

          if (newPw.length < MIN_PASSWORD_LENGTH) {
            throw new Error(
              `Password must be at least ${MIN_PASSWORD_LENGTH} characters long!`
            );
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

  agreeTos: requiresAuth.createResolver(async (_p, _args, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      try {
        const { models, token } = ctx;
        const {
          user: { unitid }
        } = await decode(token);

        const updatedUser = await models.Human.update(
          { firstlogin: false },
          { where: { unitid }, returning: true, transaction: ta }
        );

        await createLog(ctx, "agreeTos", { updatedUser: updatedUser[1] }, ta);

        return { ok: true };
      } catch (err) {
        throw new NormalError({
          message: err.message,
          internalData: { err }
        });
      }
    })
  ),

  forgotPassword: async (_p, { email }, ctx) =>
    ctx.models.sequelize.transaction(async ta => {
      try {
        const { models } = ctx;
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

        const token = await createToken(emailExists, ctx.SECRET);
        ctx.token = token;

        await createLog(
          ctx,
          "forgotPassword",
          { updatedHuman: updatedHuman[1], oldUser: user },
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

        return { ok: true, email };
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }),

  forcePasswordChange: requiresRights(["view-security"]).createResolver(
    async (_p, { userids }, ctx) =>
      ctx.models.sequelize.transaction(async transaction => {
        try {
          const { models, token } = ctx;
          const {
            user: { company }
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
            ctx,
            "forcePasswordChange",
            { units: userids },
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

  redeemSetupToken: async (_p, { setuptoken }, ctx) => {
    try {
      const { models, SECRET } = ctx;

      const setupTokenEntry = await models.Token.findOne({
        where: {
          token: setuptoken,
          expiresat: { [models.Op.gt]: models.sequelize.fn("NOW") },
          type: "setuplogin",
          usedat: null
        }
      });

      if (!setupTokenEntry) {
        throw new Error("token invalid");
      }

      const emailExists = await models.Login.findOne({
        where: { unitid: setupTokenEntry.data.unitid },
        raw: true
      });

      if (!emailExists) throw new Error("user not found");

      await checkAuthentification(emailExists.unitid, emailExists.company);

      const token = await createToken(emailExists, SECRET, "1d");
      ctx.token = token;

      const p1 = createLog(
        ctx,
        "redeemSetupToken",
        { user: emailExists, setuptoken },
        null
      );

      const p2 = models.Token.update(
        { usedat: models.sequelize.fn("NOW") },
        { where: { id: setupTokenEntry.id } }
      );

      await Promise.all([p1, p2]);

      return { ok: true, token };
    } catch (err) {
      throw new NormalError({
        message: err.message,
        internalData: { err }
      });
    }
  },

  resendToken: async (_p, { email }, { models }) =>
    models.sequelize.transaction(async ta => {
      try {
        const userEmail = await models.Email.findOne({
          where: { email },
          raw: true
        });

        if (!userEmail) {
          throw new Error("Couldn't find email!");
        } else if (userEmail.verified) {
          throw new Error("Email already verified");
        }

        const verifyToken = await createSetupToken();
        const setupToken = await createSetupToken();

        await models.Token.create(
          {
            email,
            token: setupToken,
            expiresat: moment()
              .add(4, "hour")
              .toISOString(),
            type: "setuplogin",
            data: { unitid: userEmail.unitid }
          },
          { transaction: ta }
        );

        await models.Token.create(
          {
            email,
            token: verifyToken,
            expiresat: moment()
              .add(1, "week")
              .toISOString(),
            type: "signUp"
          },
          { transaction: ta }
        );

        const downloadLink = `https://download.vipfy.store/latest/win32/x64/VIPFY-${setupToken}.exe`;
        const verifyLink = `https://vipfy.store/verify-email/${encodeURIComponent(
          email
        )}/${verifyToken}`;

        await sendEmail({
          templateId: "d-f05a3b4cf6f047e184e921b230ffb7ad",
          fromName: "VIPFY",
          personalizations: [
            {
              to: [
                {
                  email
                }
              ],
              dynamic_template_data: {
                verifyLink,
                downloadLink
              }
            }
          ]
        });

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    })
};
