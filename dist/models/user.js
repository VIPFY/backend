"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var STRING = _ref.STRING,
      BOOLEAN = _ref.BOOLEAN,
      INTEGER = _ref.INTEGER,
      ENUM = _ref.ENUM,
      DATE = _ref.DATE;

  var User = sequelize.define("user", {
    email: {
      type: STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password: STRING,
    userstatus: {
      type: ENUM("toverify", "normal", "banned", "onlynews"),
      defaultValue: "toverify"
    },
    firstname: STRING,
    middlename: STRING,
    lastname: STRING,
    title: STRING,
    sex: ENUM("m", "w", "t"),
    birthday: DATE,
    recoveryemail: STRING,
    mobilenumber: STRING,
    telefonnumber: STRING,
    addresscountry: STRING,
    addressstate: STRING,
    addresscity: STRING,
    addressstreet: STRING,
    addressnumber: STRING,
    profilepicture: STRING,
    lastactive: DATE,
    lastsecret: STRING,
    riskvalue: INTEGER,
    newsletter: {
      type: BOOLEAN,
      defaultValue: false
    }
  });

  return User;
};