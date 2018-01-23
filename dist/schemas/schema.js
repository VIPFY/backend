"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _User = require("./User");

var User = _interopRequireWildcard(_User);

var _App = require("./App");

var App = _interopRequireWildcard(_App);

var _Review = require("./Review");

var Review = _interopRequireWildcard(_Review);

var _Company = require("./Company");

var Company = _interopRequireWildcard(_Company);

var _Message = require("./Message");

var Message = _interopRequireWildcard(_Message);

var _Common = require("./Common");

var Common = _interopRequireWildcard(_Common);

var _DD = require("./DD24");

var DD24 = _interopRequireWildcard(_DD);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

//Create Arrays to store the data from every schema
var types = [];
var queries = [];
var mutations = [];
var subscriptions = [];

//Enter every schema into this array to map over it's data
var schemas = [User, App, Company, Review, DD24, Message, Common];

//Push the value into the corresponding Array to export it
schemas.forEach(function (schema) {
  types.push(schema.types);
  queries.push(schema.queries);
  mutations.push(schema.mutations);
  subscriptions.push(schema.subscriptions);
});

exports.default = "\n  " + types.join("\n") + "\n\n  type Query {\n    " + queries.join("\n") + "\n  }\n\n  type Mutation {\n    " + mutations.join("\n") + "\n  }\n\n  type Subscription {\n    " + subscriptions.join("\n") + "\n  }\n";