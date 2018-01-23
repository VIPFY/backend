"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray2 = require("babel-runtime/helpers/slicedToArray");

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

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

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

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
      var models = _ref8.models,
          SECRET = _ref8.SECRET,
          SECRETTWO = _ref8.SECRETTWO;

      var emailInUse, passwordHash, start, newHash, user, refreshSecret, _ref9, _ref10, token, refreshToken;

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

              return _context2.abrupt("return", {
                ok: false,
                error: "Email already in use!"
              });

            case 5:
              _context2.prev = 5;
              _context2.next = 8;
              return _bcrypt2.default.hash(email, 5);

            case 8:
              passwordHash = _context2.sent;


              //Change the given hash to improve security
              start = _lodash2.default.random(3, 8);
              _context2.next = 12;
              return passwordHash.replace("/", 2).substr(start);

            case 12:
              newHash = _context2.sent;
              _context2.next = 15;
              return models.User.create({
                email: email,
                newsletter: newsletter,
                password: newHash
              });

            case 15:
              user = _context2.sent;


              // Don't send emails when testing the database!
              if (process.env.USER == "postgres") {
                (0, _mailjet2.default)(email, newHash);
              }
              refreshSecret = user.password + SECRETTWO;
              _context2.next = 20;
              return (0, _auth.createTokens)(user, SECRET, refreshSecret);

            case 20:
              _ref9 = _context2.sent;
              _ref10 = (0, _slicedToArray3.default)(_ref9, 2);
              token = _ref10[0];
              refreshToken = _ref10[1];
              return _context2.abrupt("return", {
                ok: true,
                token: token,
                refreshToken: refreshToken
              });

            case 27:
              _context2.prev = 27;
              _context2.t0 = _context2["catch"](5);
              return _context2.abrupt("return", {
                ok: false,
                error: _context2.t0.message
              });

            case 30:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, undefined, [[5, 27]]);
    }));

    return function signUp(_x4, _x5, _x6) {
      return _ref6.apply(this, arguments);
    };
  }(),

  signUpConfirm: function () {
    var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(parent, _ref12, _ref13) {
      var email = _ref12.email,
          password = _ref12.password;
      var models = _ref13.models,
          SECRET = _ref13.SECRET,
          SECRETTWO = _ref13.SECRETTWO;

      var emailExists, isVerified, passwordHash, activate, refreshSecret, _ref14, _ref15, token, refreshToken;

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
              refreshSecret = passwordHash + SECRETTWO;
              _context3.next = 20;
              return (0, _auth.createTokens)(isVerified, SECRET, refreshSecret);

            case 20:
              _ref14 = _context3.sent;
              _ref15 = (0, _slicedToArray3.default)(_ref14, 2);
              token = _ref15[0];
              refreshToken = _ref15[1];
              return _context3.abrupt("return", {
                ok: true,
                token: token,
                refreshToken: refreshToken
              });

            case 27:
              _context3.prev = 27;
              _context3.t0 = _context3["catch"](10);
              return _context3.abrupt("return", {
                ok: false,
                error: "Couldn't activate user!"
              });

            case 30:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, undefined, [[10, 27]]);
    }));

    return function signUpConfirm(_x7, _x8, _x9) {
      return _ref11.apply(this, arguments);
    };
  }(),

  signIn: function signIn(parent, _ref16, _ref17) {
    var email = _ref16.email,
        password = _ref16.password;
    var models = _ref17.models,
        SECRET = _ref17.SECRET,
        SECRETTWO = _ref17.SECRETTWO;
    return (0, _auth.tryLogin)(email, password, models, SECRET, SECRETTWO);
  },

  forgotPassword: function () {
    var _ref18 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(parent, _ref19, _ref20) {
      var email = _ref19.email;
      var models = _ref20.models;
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
              start = _lodash2.default.random(3, 8);
              _context4.next = 8;
              return emailExists.dataValues.password.replace("/", 2).substr(start);

            case 8:
              newHash = _context4.sent;


              models.User.update({ password: newHash }, { where: { email: email } });

              _context4.prev = 10;

              // Don't send emails when testing the database!
              if (process.env.USER == "postgres") {
                (0, _mailjet2.default)(email, newHash);
              }
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
                error: _context4.t0.message
              });

            case 19:
            case "end":
              return _context4.stop();
          }
        }
      }, _callee4, undefined, [[10, 16]]);
    }));

    return function forgotPassword(_x10, _x11, _x12) {
      return _ref18.apply(this, arguments);
    };
  }()
};