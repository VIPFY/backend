import jwt from "jsonwebtoken";
import { pick } from "lodash";
import bcrypt from "bcrypt";

export const createTokens = async (user, secret, secret2) => {
  const createToken = await jwt.sign(
    {
      user: pick(user, ["id", "unitid"])
    },
    secret,
    {
      expiresIn: "12h"
    }
  );

  const createRefreshToken = await jwt.sign(
    {
      user: pick(user, ["id", "unitid"])
    },
    secret2,
    {
      expiresIn: "7d"
    }
  );

  return [createToken, createRefreshToken];
};

export const refreshTokens = async (token, refreshToken, models, SECRET, SECRETTWO) => {
  let userId = 0;
  try {
    const { user: { id } } = jwt.decode(refreshToken);
    userId = id;
  } catch (err) {
    return {};
  }

  if (!userId) {
    return {};
  }

  const user = await models.Human.findOne({ where: { id: userId }, raw: true });

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

export const tryLogin = async (email, password, models, SECRET, SECRETTWO) => {
  const emailExists = await models.User.findOne({ where: { email }, raw: true });
  if (!emailExists) throw new Error("Sorry, but we couldn't find your email.");

  const user = await models.Human.findById(emailExists.id);
  const valid = await bcrypt.compare(password, user.passwordhash);
  if (!valid) throw new Error("Incorrect Password!");

  const refreshTokenSecret = user.passwordhash + SECRETTWO;
  const [token, refreshToken] = await createTokens(emailExists, SECRET, refreshTokenSecret);

  return {
    ok: true,
    user: emailExists,
    token,
    refreshToken
  };
};
