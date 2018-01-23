"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (sequelize, _ref) {
  var STRING = _ref.STRING,
      BOOLEAN = _ref.BOOLEAN,
      INTEGER = _ref.INTEGER,
      ENUM = _ref.ENUM,
      DATE = _ref.DATE,
      NOW = _ref.NOW;

  var User = sequelize.define("user", {
    firstname: STRING,
    middlename: STRING,
    lastname: STRING,
    position: STRING,
    email: {
      type: STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    password: STRING,
    title: STRING,
    sex: ENUM("m", "w", "t"),
    userstatus: {
      type: ENUM("toverify", "normal", "banned", "onlynews"),
      defaultValue: "toverify"
    },
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
    },
    referall: {
      type: INTEGER,
      defaultValue: 0
    },
    cobranded: {
      type: INTEGER,
      defaultValue: 0
    },
    resetoption: {
      type: INTEGER,
      defaultValue: 0
    },
    createdAt: {
      type: DATE,
      defaultValue: NOW
    },
    updatedAt: {
      type: DATE,
      defaultValue: NOW
    }
  });

  return User;
};