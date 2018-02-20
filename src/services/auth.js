import jwt from "jsonwebtoken";
import _ from "lodash";
import bcrypt from "bcrypt";

export const createTokens = async (user, secret, secret2) => {
  const createToken = await jwt.sign(
    {
      user: _.pick(user, ["id"])
    },
    secret,
    {
      expiresIn: "12h"
    }
  );

  const createRefreshToken = await jwt.sign(
    {
      user: _.pick(user, "id")
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
  const emailExists = await models.Email.findOne({ where: { email }, raw: true });
  if (!emailExists) throw new Error("Sorry, but we couldn't find your email.");

  const humanUnit = await models.HumanUnit.findOne({ where: { unitid: emailExists.unitid } });
  const user = await models.Human.findOne({ where: { id: humanUnit.humanid } });
  const valid = await bcrypt.compare(password, user.passwordhash);
  if (!valid) throw new Error("Incorrect Password!");

  const refreshTokenSecret = user.passwordhash + SECRETTWO;
  const [token, refreshToken] = await createTokens(user, SECRET, refreshTokenSecret);

  return {
    ok: true,
    user,
    token,
    refreshToken
  };
};
