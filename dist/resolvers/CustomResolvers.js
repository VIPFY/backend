"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
// Necessary to implement interfaces
var implementMessage = exports.implementMessage = {
  __resolveType: function __resolveType(obj, context, info) {
    if (info.parentType == "Subscription") {
      return "MessageSubscription";
    }

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

var find = exports.find = function find(data) {
  var searches = {};

  data.map(function (search) {
    var id = search.toLowerCase() + "id";
    searches[search.toLowerCase()] = function (parent, args, _ref) {
      var models = _ref.models;

      return models[search].findById(parent.dataValues[id]);
    };
  });

  return searches;
};

var findNotification = exports.findNotification = function findNotification(model) {
  var searcher = {
    touser: function touser(_ref2, args, _ref3) {
      var _touser = _ref2.touser;
      var models = _ref3.models;
      return models.User.findById(_touser);
    }
  };

  model == "Notification" ? searcher.fromuser = function (_ref4, args, _ref5) {
    var dataValues = _ref4.dataValues;
    var models = _ref5.models;
    return models.User.findById(dataValues.fromuser);
  } : searcher.fromapp = function (_ref6, args, _ref7) {
    var fromapp = _ref6.fromapp;
    var models = _ref7.models;
    return models.App.findById(fromapp);
  };

  return searcher;
};