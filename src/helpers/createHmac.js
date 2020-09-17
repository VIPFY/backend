import crypto from "crypto";

export default {
  /**
   * Helper function to validate Hmac
   * @param hmac
   * @param compareString
   * @param key
   * @returns {boolean}
   */
  validateHmac: (hmac, compareString, key) => {
    const digest = this.generateHmac(compareString, key);
    return digest == hmac;
  },
  /**
   * Helper function to generate Hmac
   * @param string
   * @param key
   * @returns {*}
   */
  generateHmac: (string, key) => {
    const crypt = crypto.createHmac("sha256", Buffer.from(key, "utf-8"));
    crypt.update(string);
    return Buffer.from(crypt.digest("hex")).toString("base64");
  },
};
