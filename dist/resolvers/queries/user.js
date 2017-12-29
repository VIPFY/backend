"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _permissions = require("../../helpers/permissions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  allUsers: _permissions.requiresAuth.createResolver(function (parent, args, _ref) {
    var models = _ref.models;
    return models.User.findAll();
  }),

  me: _permissions.requiresAuth.createResolver(function (parent, args, _ref2) {
    var models = _ref2.models,
        user = _ref2.user;

    console.log(user);
    if (user) {
      // they are logged in
      return models.User.findOne({
        where: {
          id: user.id
        }
      });
    }
    // not logged in user
    return null;
  }),

  fetchUser: _permissions.requiresAuth.createResolver(function (parent, _ref3, _ref4) {
    var id = _ref3.id;
    var models = _ref4.models;
    return models.User.findById(id);
  }),

  fetchUserByPassword: function () {
    var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(parent, _ref6, _ref7) {
      var password = _ref6.password;
      var models = _ref7.models;
      var user;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return models.User.findOne({
                where: { password: password, userstatus: "toverify" }
              });

            case 2:
              user = _context.sent;
              return _context.abrupt("return", user.dataValues.email);

            case 4:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, undefined);
    }));

    return function fetchUserByPassword(_x, _x2, _x3) {
      return _ref5.apply(this, arguments);
    };
  }(),

  allEmployees: _permissions.requiresAuth.createResolver(function (parent, args, _ref8) {
    var models = _ref8.models;
    return models.Employee.findAll();
  }),

  fetchEmployee: _permissions.requiresAuth.createResolver(function (parent, _ref9, _ref10) {
    var userId = _ref9.userId;
    var models = _ref10.models;
    return models.Employee.findOne({ where: { userid: userId } });
  }),

  allUserRights: _permissions.requiresAuth.createResolver(function (parent, args, _ref11) {
    var models = _ref11.models;
    return models.UserRight.findAll();
  }),

  fetchUserRights: _permissions.requiresAuth.createResolver(function (parent, _ref12, _ref13) {
    var userid = _ref12.userid;
    var models = _ref13.models;
    return models.UserRight.findAll({ where: { userid: userid } });
  })
};