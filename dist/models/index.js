"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

var _sequelize = require("sequelize");

var _sequelize2 = _interopRequireDefault(_sequelize);

var _loginData = require("../login-data");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
This component establishes the connection to our database, loads all defined
models, adds mapping to the models so that they can be accessed in the other
components and exports everything as one big object.
*/

var sequelize = new _sequelize2.default(process.env.TEST_DB || "postgres", //Name of the database
process.env.USER, //Username
process.env.PW || _loginData.POSTGRESLOGIN, //Password
{
  dialect: "postgres", //Which database is used
  host: "localhost", //The host used
  port: process.env.PORT_DB,
  define: {
    timestamps: false
  },
  logging: process.env.LOGGING ? true : false
});

//The mapping here will be used in the resolver to access the model.
//For example models.User
var db = {
  User: sequelize.import("./user"),
  App: sequelize.import("./app"),
  Company: sequelize.import("./company"),
  Department: sequelize.import("./department"),
  Employee: sequelize.import("./employee"),
  Developer: sequelize.import("./developer"),
  Review: sequelize.import("./review"),
  AppImage: sequelize.import("./appimage"),
  UserRight: sequelize.import("./userright"),
  Plan: sequelize.import("./plan"),
  Notification: sequelize.import("./notification"),
  AppNotification: sequelize.import("./appnotification"),
  ReviewHelpful: sequelize.import("./reviewhelpful"),
  Speak: sequelize.import("./speak"),
  UserBill: sequelize.import("./userbill")
};

(0, _keys2.default)(db).forEach(function (modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;

exports.default = db;