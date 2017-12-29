"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var STRING = _ref.STRING,
      INTEGER = _ref.INTEGER;

  var Company = sequelize.define("company", {
    name: STRING,
    companylogo: STRING,
    addresscountry: STRING,
    addressstate: STRING,
    addresscity: STRING,
    addressstreet: STRING,
    addressnumber: INTEGER
  });

  return Company;
};

//id |name|companylogo| addresscountry |
//addressstate  |addresscity|addressstreet  | addressnumber