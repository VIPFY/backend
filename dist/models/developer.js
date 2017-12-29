"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var INTEGER = _ref.INTEGER,
      STRING = _ref.STRING;

  var Developer = sequelize.define("developer", {
    name: STRING,
    website: {
      type: STRING,
      validate: {
        isUrl: true
      }
    },
    legalwebsite: {
      type: STRING,
      validate: {
        isUrl: true
      }
    },
    bankaccount: STRING
  });

  return Developer;
};