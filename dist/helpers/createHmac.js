"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _crypto = require("crypto");

var _crypto2 = _interopRequireDefault(_crypto);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Utility = {};

/**
 * Helper function to validate Hmac
 * @param hmac
 * @param compareString
 * @param key
 * @returns {boolean}
 */
Utility.validateHmac = function (hmac, compareString, key) {
  var digest = this.generateHmac(compareString, key);
  return digest == hmac;
};

/**
 * Helper function to generate Hmac
 * @param string
 * @param key
 * @returns {*}
 */
Utility.generateHmac = function (string, key) {
  var crypt = _crypto2.default.createHmac("sha256", new Buffer(key, "utf-8"));
  crypt.update(string);
  return new Buffer(crypt.digest("hex")).toString("base64");
};

exports.default = Utility;