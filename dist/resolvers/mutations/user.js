"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _bcrypt = require("bcrypt");

var _bcrypt2 = _interopRequireDefault(_bcrypt);

var _jsonwebtoken = require("jsonwebtoken");

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _auth = require("../../services/auth");

var _permissions = require("../../helpers/permissions");

var _mailjet = require("../../services/mailjet");

var _mailjet2 = _interopRequireDefault(_mailjet);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  updateUser: _permissions.requiresAuth.createResolver(function (parent, _ref, _ref2) {
    var firstname = _ref.firstname,
        newFirstName = _ref.newFirstName;
    var models = _ref2.models;
    return models.User.update({ firstname: newFirstName }, { where: { firstname: firstname } });
  }),

  deleteUser: _permissions.requiresAuth.createResolver(function () {
    var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(parent, _ref4, _ref5) {
      var id = _ref4.id;
      var models = _ref5.models;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return models.User.destroy({ where: { id: id } });

            case 2:
              return _context.abrupt("return", "User was deleted");

            case 3:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, undefined);
    }));

    return function (_x, _x2, _x3) {
      return _ref3.apply(this, arguments);
    };
  }()),

  signUp: function () {
    var _ref6 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(parent, _ref7, _ref8) {
      var email = _ref7.email,
          newsletter = _ref7.newsletter;
      var models = _ref8.models;
      var emailInUse, passwordHash, start, newHash, user;
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return models.User.findOne({ where: { email: email } });

            case 2:
              emailInUse = _context2.sent;

              if (!emailInUse) {
                _context2.next = 5;
                break;
              }

              throw new Error("Email already in use!");

            case 5:
              _context2.prev = 5;
              _context2.next = 8;
              return _bcrypt2.default.hash(email, 5);

            case 8:
              passwordHash = _context2.sent;


              //Change the given hash to improve security
              start = _.random(3, 8);
              newHash = passwordHash.replace("/", 2).substr(start);
              _context2.next = 13;
              return models.User.create({
                email: email,
                newsletter: newsletter,
                password: newHash
              });

            case 13:
              user = _context2.sent;


              (0, _mailjet2.default)(user.email, newHash);
              return _context2.abrupt("return", {
                ok: true,
                user: user
              });

            case 18:
              _context2.prev = 18;
              _context2.t0 = _context2["catch"](5);

              console.log(_context2.t0);
              return _context2.abrupt("return", {
                ok: false
              });

            case 22:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, undefined, [[5, 18]]);
    }));

    return function signUp(_x4, _x5, _x6) {
      return _ref6.apply(this, arguments);
    };
  }(),

  signUpConfirm: function () {
    var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(parent, _ref10, _ref11) {
      var email = _ref10.email,
          password = _ref10.password;
      var models = _ref11.models;
      var emailExists, isVerified, passwordHash, activate;
      return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return models.User.findOne({ where: { email: email } });

            case 2:
              emailExists = _context3.sent;

              if (emailExists) {
                _context3.next = 5;
                break;
              }

              return _context3.abrupt("return", { ok: false, error: "Email not found!" });

            case 5:
              _context3.next = 7;
              return models.User.findOne({
                where: { email: email, userstatus: "normal" }
              });

            case 7:
              isVerified = _context3.sent;

              if (!isVerified) {
                _context3.next = 10;
                break;
              }

              return _context3.abrupt("return", { ok: false, error: "User already verified!" });

            case 10:
              _context3.prev = 10;
              _context3.next = 13;
              return _bcrypt2.default.hash(password, 12);

            case 13:
              passwordHash = _context3.sent;
              _context3.next = 16;
              return models.User.update({ password: passwordHash, userstatus: "normal" }, { where: { email: email } });

            case 16:
              activate = _context3.sent;
              return _context3.abrupt("return", {
                ok: true
              });

            case 20:
              _context3.prev = 20;
              _context3.t0 = _context3["catch"](10);
              return _context3.abrupt("return", {
                ok: false,
                error: "Couldn't activate user!"
              });

            case 23:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, undefined, [[10, 20]]);
    }));

    return function signUpConfirm(_x7, _x8, _x9) {
      return _ref9.apply(this, arguments);
    };
  }(),

  signIn: function signIn(parent, _ref12, _ref13) {
    var email = _ref12.email,
        password = _ref12.password;
    var models = _ref13.models,
        SECRET = _ref13.SECRET,
        SECRETTWO = _ref13.SECRETTWO;
    return (0, _auth.tryLogin)(email, password, models, SECRET, SECRETTWO);
  },

  forgotPassword: function () {
    var _ref14 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(parent, _ref15, _ref16) {
      var email = _ref15.email;
      var models = _ref16.models;
      var emailExists, start, newHash;
      return _regenerator2.default.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 2;
              return models.User.findOne({ where: { email: email } });

            case 2:
              emailExists = _context4.sent;

              if (emailExists) {
                _context4.next = 5;
                break;
              }

              return _context4.abrupt("return", {
                ok: false,
                error: "Email doesn't exist!"
              });

            case 5:

              //Change the given hash to improve security
              start = _.random(3, 8);
              _context4.next = 8;
              return emailExists.dataValues.password.replace("/", 2).substr(start);

            case 8:
              newHash = _context4.sent;


              models.User.update({ password: newHash }, { where: { email: email } });

              _context4.prev = 10;

              (0, _mailjet2.default)(email, newHash);
              //Exchange this for a new solution when a proper mailjet template exists
              models.User.update({ userstatus: "toverify" }, { where: { email: email } });

              return _context4.abrupt("return", {
                ok: true,
                email: email
              });

            case 16:
              _context4.prev = 16;
              _context4.t0 = _context4["catch"](10);
              return _context4.abrupt("return", {
                ok: false,
                error: _context4.t0
              });

            case 19:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, undefined, [[10, 16]]);
    }));

    return function forgotPassword(_x10, _x11, _x12) {
      return _ref14.apply(this, arguments);
    };
  }()
};