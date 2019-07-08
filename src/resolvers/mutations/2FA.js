import { decode } from "jsonwebtoken";
import Speakeasy from "speakeasy";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";

export default {
  generateSecret: requiresRights(["create-2FA"]).createResolver(
    async (_, args, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);
        // Will generate a secret key of length 32
        const secret = Speakeasy.generateSecret();
        await models.TwoFA.create({
          unitid,
          secret,
          type: "totp",
          lastused: models.sequelize.fn("NOW")
        });

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  generateToken: requiresRights(["create-2FA"]).createResolver(
    async (_, { type }, { models, token }) => {
      try {
        const {
          user: { unitid, company }
        } = decode(token);
        const { secret } = await models.TwoFA.findOne({
          where: { unitid, type },
          raw: true
        });

        return secret.otpauth_url;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  validateToken: requiresRights(["create-2FA"]).createResolver(
    async (_, { type, tokenString }, { models, token }) => {
      try {
        const {
          user: { unitid }
        } = decode(token);
        const { secret } = await models.TwoFA.findOne({
          where: { unitid, type },
          raw: true
        });

        const validToken = Speakeasy.totp.verify({
          secret: secret.base32,
          encoding: "base32",
          token: tokenString,
          window: 2
        });

        if (validToken) {
          return true;
        } else {
          throw new Error("Invalid Token or Token expired");
        }
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
