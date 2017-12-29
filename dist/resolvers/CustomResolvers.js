"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var findUser = exports.findUser = {
  user: function user(_ref, args, _ref2) {
    var userid = _ref.userid;
    var models = _ref2.models;
    return models.User.findById(userid);
  }
};

var findApp = exports.findApp = {
  app: function app(_ref3, args, _ref4) {
    var appid = _ref3.appid;
    var models = _ref4.models;
    return models.App.findById(appid);
  }
};

var findNotification = exports.findNotification = function findNotification(model) {
  var searcher = {
    touser: function touser(_ref5, args, _ref6) {
      var _touser = _ref5.touser;
      var models = _ref6.models;
      return models.User.findById(_touser);
    }
  };
  model == "Notification" ? searcher.fromuser = function (_ref7, args, _ref8) {
    var fromuser = _ref7.fromuser;
    var models = _ref8.models;
    return models.User.findById(fromuser);
  } : searcher.fromapp = function (_ref9, args, _ref10) {
    var fromapp = _ref9.fromapp;
    var models = _ref10.models;
    return models.App.findById(fromapp);
  };

  return searcher;
};

// Necessary to implement interfaces
var implementMessage = exports.implementMessage = {
  __resolveType: function __resolveType(obj, context, info) {
    if (obj.fromuser) {
      return "Notification";
    }

    if (obj.fromapp) {
      return "AppNotification";
    }

    return null;
  }
};

var implementDate = exports.implementDate = {
  name: "Date",
  description: "Date custom scalar type. Returns a large integer",
  parseValue: function parseValue(value) {
    return new Date(value); // value from the client
  },
  serialize: function serialize(value) {
    return value.getTime(); // value sent to the client
  },
  parseLiteral: function parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return parseInt(ast.value, 10); // ast value is always in string format
    }
    return null;
  }
};