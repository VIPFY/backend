import crypto from "crypto";

const Utility = {};

/**
 * Helper function to validate Hmac
 * @param hmac
 * @param compareString
 * @param key
 * @returns {boolean}
 */
Utility.validateHmac = function (hmac, compareString, key) {
  const digest = this.generateHmac(compareString, key);
  return digest == hmac;
};

/**
 * Helper function to generate Hmac
 * @param string
 * @param key
 * @returns {*}
 */
Utility.generateHmac = function (string, key) {
  const crypt = crypto.createHmac("sha256", new Buffer(key, "utf-8"));
  crypt.update(string);
  return new Buffer(crypt.digest("hex")).toString("base64");
};

export default Utility;
