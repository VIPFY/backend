import secureRandom from "secure-random-uniform";
import models from "@vipfy-private/sequelize-setup";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const computeTokenCheckDigit = token => {
  try {
    let sum = 0;
    for (let i = 0; i < 20; i++) {
      const index = alphabet.indexOf(token[i]);
      if (index === -1) {
        throw new Error("invalid token");
      }
      sum *= 7; // 7 is prime
      sum += index + 1;
    }
    return alphabet[sum % alphabet.length];
  } catch (e) {
    throw new Error("error computing checkdigit");
  }
};

/**
 * create a new token. Tokens are 21 digits long in base62 encoding
 *
 * since there are 62^20 ~= 2^119 possible tokens, duplicates are considered
 * excessively unlikely and brute forcing is impossible
 */
export const createToken = () => {
  let token = "";
  for (let i = 0; i < 20; i++) {
    token += alphabet[secureRandom(alphabet.length)];
  }
  token += computeTokenCheckDigit(token);
  return token;
};

/**
 * Checks whether a token is valid
 * @exports
 *
 * @param {string} token
 * @param {string} type The kind of token which shall be checked
 * @returns {boolean}
 */
export const checkToken = async (token, type) => {
  console.log("LOG: checkToken -> token, type", token, type);
  try {
    const validToken = await models.Token.findOne({
      where: {
        token,
        type,
        usedat: null,
        expiresat: {
          [models.Op.gt]: models.sequelize.fn("NOW")
        }
      },
      raw: true
    });

    if (validToken) {
      return true;
    } else {
      throw new Error("Token not found!");
    }
  } catch (error) {
    throw new Error(error);
  }
};
