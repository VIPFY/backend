import Speakeasy from "speakeasy";
import { requiresRights } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createToken } from "../../helpers/auth";

export default {
  verifyToken: requiresRights(["create-2FA"]).createResolver(
    async (_, { userid, type, code, codeId }, { models }) => {
      try {
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

  validateToken: async (_, { userid, type, token }, { models, SECRET }) => {
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

        return createToken(data[0], SECRET);
      } else {
        throw new Error("Invalid Token or Token expired");
      }
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  force2FA: requiresRights(["force-2FA"]).createResolver(
    async (_, { userid }, { models }) => {
      try {
        await models.Human.update(
          { needstwofa: true },
          { where: { unitid: userid } }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
