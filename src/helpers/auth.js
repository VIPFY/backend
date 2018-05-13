import jwt from "jsonwebtoken";
import { pick } from "lodash";

export const createTokens = async (user, SECRET, SECRET2) => {
  const createToken = await jwt.sign(
    {
      user: pick(user, ["unitid", "company"])
    },
    SECRET,
    {
      expiresIn: "12h"
    }
  );

  const createRefreshToken = await jwt.sign(
    {
      user: pick(user, ["unitid", "company"])
    },
    SECRET2,
    {
      expiresIn: "7d"
    }
  );

  return [createToken, createRefreshToken];
};

export const refreshTokens = async (token, refreshToken, models, SECRET, SECRETTWO) => {
  let userId = 0;
  try {
    const { user: { unitid } } = jwt.decode(refreshToken);
    userId = unitid;
  } catch (err) {
    return {};
  }

  if (!userId) {
    return {};
  }

  const user = await models.Human.findOne({ where: { unitid: userId }, raw: true });

  if (!user) {
    return {};
  }

  const refreshSecret = user.passwordhash + SECRETTWO;

  try {
    jwt.verify(refreshToken, refreshSecret);
  } catch (err) {
    return {};
  }

  const [newToken, newRefreshToken] = await createTokens(user, SECRET, refreshSecret);
  return {
    token: newToken,
    refreshToken: newRefreshToken,
    user
  };
};
