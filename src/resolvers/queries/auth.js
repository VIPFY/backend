import { decode, sign } from "jsonwebtoken";
import crypto from "crypto";
import { SodiumPlus, X25519PublicKey } from "sodium-plus";
import cryptoRandomString from "crypto-random-string";
import moment from "moment";
import Speakeasy from "speakeasy";
import QRCode from "qrcode";
import {
  parentAdminCheck,
  concatName,
  check2FARights,
  fetchSessions,
  parseSessions,
  generateFakeKey,
} from "../../helpers/functions";
import { requiresAuth, requiresRights } from "../../helpers/permissions";
import { AuthError, NormalError } from "../../errors";

export default {
  me: requiresAuth.createResolver(
    async (_p, _args, { models, session, deviceId }) => {
      // they are logged in
      if (session && session.token) {
        try {
          const {
            user: { unitid },
          } = decode(session.token);

          const me = await models.User.findByPk(unitid);
          const user = await parentAdminCheck(me);

          if (me.dataValues.needstwofa) {
            const hasTwoFa = await models.Login.findOne({
              where: {
                unitid: me.dataValues.id,
                twofactor: { [models.Op.not]: null },
              },
              raw: true,
            });

            if (hasTwoFa) {
              user.dataValues.needstwofa = false;
            }
          }

          const superSecretKey =
            process.env.PSEUDONYMIZATION_SECRET || "yzSlffJLHor0UPCCLYCL";

          user.dataValues.pseudonymousid = crypto
            .createHmac("sha256", superSecretKey)
            .update(me.dataValues.id)
            .digest("hex");

          user.dataValues.pseudonymousdeviceid = crypto
            .createHmac("sha256", superSecretKey)
            .update(deviceId)
            .digest("hex");

          return user.dataValues;
        } catch (err) {
          throw new NormalError({
            message: `Me-Query-ERROR ${err.message}`,
            internalData: { err },
          });
        }
      } else throw new AuthError();
    }
  ),

  fetchSemiPublicUser: requiresRights(["view-users"]).createResolver(
    async (_parent, { userid }, { models }) => {
      try {
        const user = await models.User.findOne({
          where: { id: userid, deleted: false },
          raw: true,
        });

        return parentAdminCheck(user);
      } catch (err) {
        throw new NormalError({
          message: `fetchSemiPublicUser-Query-ERROR ${err.message}`,
          internalData: { err },
        });
      }
    }
  ),

  checkAuthToken: async (_p, { token }, { models }) => {
    try {
      const validToken = await models.Token.findOne({
        where: { token, type: "signUp" },
        raw: true,
      });

      if (!validToken) {
        throw new Error("Invalid Token");
      } else if (validToken.usedat) {
        return { ok: false, used: true };
      } else if (moment(validToken.expiresat).isBefore(moment())) {
        return { ok: false, expired: true };
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
          user: { unitid, company },
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
            lastused: models.sequelize.fn("NOW"),
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
            challenge,
          };

          return { yubikey };
        }
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchUsersSessions: requiresRights([
    "show-sessions",
    "myself",
  ]).createResolver(async (_p, { userid }, { redis }) => {
    try {
      const sessions = await fetchSessions(redis, userid);

      return parseSessions(sessions);
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  fetchPwParams: async (_p, { email }, ctx) => {
    try {
      const emailExists = await ctx.models.Login.findOne({
        where: {
          email,
          deleted: { [ctx.models.Op.or]: [null, false] },
          banned: { [ctx.models.Op.or]: [null, false] },
          suspended: { [ctx.models.Op.or]: [null, false] },
        },
        raw: true,
      });

      if (!emailExists || !emailExists.passwordsalt) {
        return generateFakeKey(email, true);
      }

      return {
        id: email,
        salt: emailExists.passwordsalt,
        ops: 2,
        mem: 67108864,
      };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  fetchKey: requiresAuth.createResolver(async (_p, { id }, { models }) => {
    try {
      return models.Key.findOne({ where: { id } });
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  }),

  fetchKeys: requiresAuth.createResolver(
    async (_p, { publickey }, { models }) => {
      try {
        return models.Key.findAll({ where: { publickey } });
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
          where: { unitid, encryptedby: null },
          order: [["createdat", "DESC"]],
          limit: 1,
        });

        if (keys.length == 0) {
          return null;
        }

        return keys[0];
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  fetchRecoveryChallenge: async (_p, { email }, { models, SECRET, redis }) => {
    try {
      const emailExists = await models.Login.findOne({
        where: {
          email,
          deleted: { [models.Op.or]: [null, false] },
          banned: { [models.Op.or]: [null, false] },
          suspended: { [models.Op.or]: [null, false] },
        },
        raw: true,
      });

      if (!emailExists || !emailExists.recoveryprivatekey) {
        const [{ salt }, { salt: publicKey }] = await Promise.all([
          generateFakeKey(email),
          generateFakeKey("asdfasd4adfga3de"),
        ]);

        const token = sign({ data: cryptoRandomString(10) }, salt, {
          expiresIn: "1h",
        });

        return { encryptedKey: salt, publicKey, token };
      }

      const sodium = await SodiumPlus.auto();
      const secret = cryptoRandomString(32);

      const buffer = await sodium.crypto_box_seal(
        secret,
        new X25519PublicKey(Buffer.from(emailExists.recoverypublickey, "hex"))
      );

      const token = sign({ encryptedSecret: buffer.toString("hex") }, SECRET, {
        expiresIn: "1h",
      });

      await redis.set(email, secret, "EX", 3600);

      return {
        encryptedKey: emailExists.recoveryprivatekey,
        publicKey: emailExists.recoverypublickey,
        token,
      };
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },
};
