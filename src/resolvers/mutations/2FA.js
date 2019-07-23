import Speakeasy from "speakeasy";
import { decode } from "jsonwebtoken";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createToken } from "../../helpers/token";
import { companyCheck } from "../../helpers/functions";

export default {
  verifyToken: requiresRights(["create-2FA"]).createResolver(
    async (_, { userid, type, code, codeId }, { models, token }) => {
      try {
        const {
          user: { unitid, company }
        } = decode(token);

        await companyCheck(company, unitid, userid);

        const { secret, id } = await models.TwoFA.findOne({
          where: { unitid: userid, type, verified: false, id: codeId },
          raw: true
        });

        const validToken = Speakeasy.totp.verify({
          secret: secret.base32,
          encoding: "base32",
          token: code,
          window: 2
        });
        console.log("LOG: validToken", validToken);

        if (!validToken) {
          throw new Error("The code was not valid!");
        }

        await models.TwoFA.update({ verified: true }, { where: { id } });

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  ),

  validateToken: requiresRights(["create-2FA"]).createResolver(
    async (_, { userid, type, token }, { models, SECRET }) => {
      try {
        const { secret, id } = await models.TwoFA.findOne({
          where: { unitid: userid, type },
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
            where: { unitid: userid },
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
