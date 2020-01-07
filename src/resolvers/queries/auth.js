import { decode } from "jsonwebtoken";
import crypto from "crypto";
import moment from "moment";
import Speakeasy from "speakeasy";
import QRCode from "qrcode";
import {
  parentAdminCheck,
  concatName,
  check2FARights,
  fetchSessions,
  parseSessions
} from "../../helpers/functions";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { AuthError, NormalError } from "../../errors";
import { USER_SESSION_ID_PREFIX } from "../../constants";

export default {
  me: requiresAuth.createResolver(async (_p, _args, { models, session }) => {
    // they are logged in
    if (session && session.token) {
      try {
        const {
          user: { unitid }
        } = decode(session.token);

        const me = await models.User.findByPk(unitid);
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
        const user = await models.User.findOne({
          where: { id: userid, deleted: false },
          raw: true
        });

        return parentAdminCheck(user);
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
    async (_p, { type, userid }, { models, session }) => {
      try {
        let {
          user: { unitid, company }
        } = decode(session.token);

        if (userid && userid != unitid) {
          unitid = await check2FARights(userid, unitid, company);
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
  ),

  fetchUsersSessions: requiresRights(["show-sessions"]).createResolver(
    async (_p, { userid }, { redis }) => {
      try {
        const sessions = await fetchSessions(redis, userid);

        return parseSessions(sessions);
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchPwParams: async (_p, { email }, ctx) => {
    try {
      const emailExists = await ctx.models.Login.find({
        where: {
          email,
          deleted: { [ctx.models.Op.or]: [null, false] },
          banned: { [ctx.models.Op.or]: [null, false] },
          suspended: { [ctx.models.Op.or]: [null, false] }
        },
        raw: true
      });

      if (!emailExists || !emailExists.passwordsalt) {
        // generate fake salt in an attempt to make it less obvious if the user exists
        // this is vulnerable against timing attacks
        // make fake salt deterministic, otherwise calling this twice will reveal if the user exists
        const crypt = crypto.createHmac(
          "sha256",
          "eAiJzhVOvT0PeSTDkeWrbLICTE7aeTQ1"
        );
        crypt.update(email);
        const salt = crypt.digest("hex").substring(0, 32);
        return { id: email, salt, ops: 2, mem: 67108864 };
      }

      return {
        id: email,
        salt: emailExists.passwordsalt,
        ops: 2,
        mem: 67108864
      };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  fetchKey: requiresAuth.createResolver(
    async (_p, { id }, { models, session }) => {
      try {
        const {
          user: { unitid }
        } = decode(session.token);
        const key = await models.Key.findOne({
          where: { id, unitid }
        });
        return key;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchCurrentKey: requiresAuth.createResolver(
    async (_p, { unitid }, { models, session }) => {
      try {
        if (!unitid) {
          // eslint-disable-next-line prefer-destructuring
          unitid = decode(session.token).user.unitid;
        }
        const keys = await models.Key.findAll({
          where: { unitid },
          order: [["createdat", "DESC"]],
          limit: 1
        });
        if (keys.length == 0) {
          return null;
        }
        return keys[0];
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
