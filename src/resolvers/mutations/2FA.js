import Speakeasy from "speakeasy";
import { decode } from "jsonwebtoken";
import iplocate from "node-iplocate";
import { requiresRights, requiresAuth } from "../../helpers/permissions";
import { NormalError } from "../../errors";
import { createToken } from "../../helpers/auth";
import { checkToken } from "../../helpers/token";
import { check2FARights } from "../../helpers/functions";
import { USER_SESSION_ID_PREFIX } from "../../constants";

export default {
  verify2FA: requiresAuth.createResolver(
    async (_p, { userid, type, code, codeId }, { models, session }) => {
      try {
        let {
          user: { unitid, company }
        } = decode(session.token);

        if (userid && userid != unitid) {
          unitid = await check2FARights(userid, unitid, company);
        }

        const { secret, id } = await models.TwoFA.findOne({
          where: { unitid, type, verified: false, id: codeId },
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

  validate2FA: async (_p, { userid, type, token, twoFAToken }, ctx) => {
    try {
      const { models, SECRET } = ctx;
      const { secret, id } = await models.TwoFA.findOne({
        where: { unitid: userid, type, verified: true, deleted: null },
        raw: true
      });
      await checkToken(twoFAToken, "2FAToken");

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

        const p3 = models.Token.update(
          { usedat: models.sequelize.fn("NOW") },
          { where: { token: twoFAToken } }
        );

        const data = await Promise.all([p1, p2, p3]);

        const newToken = await createToken(data[0], SECRET);

        const location = await iplocate(
          // In development using the ip is not possible
          process.env.ENVIRONMENT == "production" ? ctx.ip : "192.76.145.3"
        );

        await ctx.redis.lpush(
          `${USER_SESSION_ID_PREFIX}${userid}`,
          JSON.stringify({
            session: ctx.sessionID,
            ...ctx.userData,
            ...location,
            loggedInAt: Date.now()
          })
        );

        // Should normally not be needed, but somehow it takes too long to
        // update the session and it creates an Auth Error in the next step
        // without it.
        ctx.session.save(err => {
          if (err) {
            console.error("\x1b[1m%s\x1b[0m", "ERR:", err);
          }
        });

        return newToken;
      } else {
        throw new Error("Invalid Token or Token expired");
      }
    } catch (err) {
      throw new NormalError({ message: err.message, internalData: { err } });
    }
  },

  force2FA: requiresRights(["force-2FA"]).createResolver(
    async (_p, { userid }, { models }) => {
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
  ),

  unForce2FA: requiresRights(["force-2FA"]).createResolver(
    async (_p, { userid }, { models }) => {
      try {
        await models.Human.update(
          { needstwofa: false },
          { where: { unitid: userid } }
        );

        return true;
      } catch (err) {
        throw new NormalError({ message: err.message, internalData: { err } });
      }
    }
  )
};
