import jwt from "jsonwebtoken";
import { pick } from "lodash";
import { parentAdminCheck } from "../helpers/functions";

export const createTokens = async (user, SECRET, SECRET2) => {
  try {
    const createToken = await jwt.sign({ user: pick(user, ["unitid", "company"]) }, SECRET, {
      expiresIn: "12h"
    });

    const createRefreshToken = await jwt.sign(
      { user: pick(user, ["unitid", "company"]) },
      SECRET2,
      {
        expiresIn: "7d"
      }
    );

    return [createToken, createRefreshToken];
  } catch (err) {
    throw new Error(err.message);
  }
};

export const refreshTokens = async (refreshToken, models, SECRET, SECRET_TWO) => {
  let userId = 0;

  try {
    const { user: { unitid } } = await jwt.decode(refreshToken);
    userId = unitid;

    if (!userId) {
      return {};
    }

    const p1 = await models.Human.findOne({ where: { unitid: userId }, raw: true });
    const p2 = await models.User.findOne({ where: { id: userId }, raw: true });
    const [user, basicUser] = await Promise.all([p1, p2]);

    if (!user) {
      return {};
    }

    const refreshSecret = user.passwordhash + SECRET_TWO;

    await jwt.verify(refreshToken, refreshSecret);

    const refreshUser = await parentAdminCheck(models, basicUser);

    const [newToken, newRefreshToken] = await createTokens(refreshUser, SECRET, refreshSecret);
    return {
      token: newToken,
      refreshToken: newRefreshToken,
      refreshUser
    };
  } catch (err) {
    console.log(err);
    return {};
  }
};
