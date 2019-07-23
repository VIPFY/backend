import { decode } from "jsonwebtoken";
import moment from "moment";
import U2F from "u2f";
import Speakeasy from "speakeasy";
import QRCode from "qrcode";

import { parentAdminCheck } from "../../helpers/functions";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { AuthError, NormalError } from "../../errors";

export default {
  me: requiresAuth.createResolver(async (_, args, { models, token }) => {
    // they are logged in
    if (token && token != "null") {
      try {
        const {
          user: { unitid }
        } = decode(token);

        const me = await models.User.findById(unitid);
        const user = await parentAdminCheck(me);

        return user;
      } catch (err) {
        throw new NormalError({
          message: `Me-Query-ERROR ${err.message}`,
          internalData: { err }
        });
      }
    } else throw new AuthError();
  }),

  fetchSemiPublicUser: requiresRights(["view-users"]).createResolver(
    async (_, { unitid }, { models }) => {
      try {
        //const me = await models.User.findById(unitid);

        const me = await models.sequelize.query(
          `SELECT * FROM users_view
         WHERE id = :unitid`,
          {
            replacements: { unitid },
            type: models.sequelize.QueryTypes.SELECT
          }
        );
        console.log("ME", me[0], me[0].id);
        const user = await parentAdminCheck(me[0]);

        return user;
      } catch (err) {
        throw new NormalError({
          message: `fetchSemiPublicUser-Query-ERROR ${err.message}`,
          internalData: { err }
        });
      }
    }
  ),

  checkAuthToken: async (_, { email, token }, { models }) => {
    try {
      const validToken = await models.Token.findOne({
        where: {
          token,
          type: "signUp",
          email
        },
        raw: true
      });

      if (!validToken) {
        throw new Error("Invalid Token");
      } else if (validToken.usedat) {
        return {
          ok: false,
          used: true
        };
      } else if (moment(validToken.expiresat).isBefore(moment())) {
        return {
          ok: false,
          expired: true
        };
      } else {
        return { ok: true };
      }
    } catch (err) {
      throw new NormalError({ message: err.message });
    }
  },

  generateSecret: requiresRights(["create-2FA"]).createResolver(
    async (_, { type }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);

        if (type == "totp") {
          // Will generate a secret key of length 32
          const secret = Speakeasy.generateSecret();
          await models.TwoFA.create({
            unitid,
            secret,
            type: "totp",
            lastused: models.sequelize.fn("NOW")
          });

          const qrCode = await QRCode.toDataURL(secret.otpauth_url);

          return qrCode;
        } else {
          U2F.request("https://api.vipfy.store");

          return "string";
        }
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
