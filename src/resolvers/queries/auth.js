import { decode } from "jsonwebtoken";
import crypto from "crypto";
import moment from "moment";
import Speakeasy from "speakeasy";
import QRCode from "qrcode";
import { parentAdminCheck, concatName } from "../../helpers/functions";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { AuthError, NormalError } from "../../errors";

export default {
  me: requiresAuth.createResolver(async (_, _args, { models, token }) => {
    // they are logged in
    if (token && token != "null") {
      try {
        const {
          user: { unitid }
        } = decode(token);

        const me = await models.User.findById(unitid);
        const user = await parentAdminCheck(me);

        if (me.dataValues.needstwofa) {
          const hasTwoFa = await models.Login.findOne({
            where: {
              unitid: me.dataValues.id,
              twofactor: { [models.Op.not]: null }
            },
            raw: true
          });

          if (hasTwoFa) {
            user.dataValues.needstwofa = false;
          }
        }

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
    async (_parent, { userid }, { models }) => {
      try {
        // const me = await models.User.findById(unitid);

        const me = await models.sequelize.query(
          `SELECT * FROM users_view
         WHERE id = :userid and deleted = false`,
          {
            replacements: { userid },
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

  generateSecret: requiresAuth.createResolver(
    async (_, { type, userid }, { models, token }) => {
      try {
        let {
          user: { unitid }
        } = decode(token);

        if (userid && userid != unitid) {
          unitid = userid;
        }

        if (type == "totp") {
          // Will generate a secret key of length 32
          const secret = Speakeasy.generateSecret({ name: "VIPFY" });
          const twoFA = await models.TwoFA.create({
            unitid,
            secret,
            type: "totp",
            lastused: models.sequelize.fn("NOW")
          });

          const qrCode = await QRCode.toDataURL(secret.otpauth_url);

          return { qrCode, codeId: twoFA.dataValues.id };
        } else {
          const p1 = models.User.findOne({ where: { id: userid }, raw: true });

          const p2 = crypto.randomBytes(256);

          const [user, challenge] = await Promise.all([p1, p2]);
          const name = concatName(user);

          const yubikey = {
            rp: { name: "VIPFY" },
            user: { id: userid, name, displayName: name },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            attestation: "direct",
            timeout: 60000,
            challenge
          };

          return { yubikey };
        }
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
