"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require("babel-runtime/core-js/object/assign");

var _assign2 = _interopRequireDefault(_assign);

var _user = require("./queries/user");

var _user2 = _interopRequireDefault(_user);

var _app = require("./queries/app");

var _app2 = _interopRequireDefault(_app);

var _company = require("./queries/company");

var _company2 = _interopRequireDefault(_company);

var _message = require("./queries/message");

var _message2 = _interopRequireDefault(_message);

var _review = require("./queries/review");

var _review2 = _interopRequireDefault(_review);

var _dd = require("./mutations/dd24");

var _dd2 = _interopRequireDefault(_dd);

var _message3 = require("./mutations/message");

var _message4 = _interopRequireDefault(_message3);

var _user3 = require("./mutations/user");

var _user4 = _interopRequireDefault(_user3);

var _review3 = require("./mutations/review");

var _review4 = _interopRequireDefault(_review3);

var _CustomResolvers = require("./CustomResolvers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Query = (0, _assign2.default)(_user2.default, _app2.default, _company2.default, _message2.default, _review2.default);

var Mutation = (0, _assign2.default)(_dd2.default, _message4.default, _user4.default, _review4.default);

exports.default = {
  Query: Query,
  Mutation: Mutation,
  Employee: _CustomResolvers.findUser,
  Plan: _CustomResolvers.findApp,
  Review: _CustomResolvers.findUser,
  UserRight: _CustomResolvers.findUser,
  Notification: (0, _CustomResolvers.findNotification)("Notification"),
  AppNotification: (0, _CustomResolvers.findNotification)("AppNotification"),
  Message: _CustomResolvers.implementMessage,
  Date: _CustomResolvers.implementDate,
  LoginResponse: _CustomResolvers.findUser
};