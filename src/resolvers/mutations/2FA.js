import { decode } from "jsonwebtoken";
import Speakeasy from "speakeasy";
import U2F from "u2f";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createToken } from "../../helpers/token";

export default {
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
        } else {
          U2F.request("https://api.vipfy.store");
        }

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  validateToken: requiresRights(["create-2FA"]).createResolver(
    async (_, { unitid, type, token }, { models, SECRET }) => {
      try {
        const { secret, id } = await models.TwoFA.findOne({
          where: { unitid, type },
          raw: true
        });

        const validToken = Speakeasy.totp.verify({
          secret: secret.base32,
          encoding: "base32",
          token,
          window: 2
        });

        if (validToken) {
          const p1 = models.Login.findOne({
            where: { unitid },
            raw: true
          });

          const p2 = models.TwoFA.update(
            {
              lastused: models.sequelize.fn("NOW"),
              used: models.sequelize.literal("used + 1")
            },
            { where: { id } }
          );

          const data = await Promise.all([p1, p2]);

          const loginToken = await createToken(data[0], SECRET);

          return loginToken;
        } else {
          throw new Error("Invalid Token or Token expired");
        }
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
