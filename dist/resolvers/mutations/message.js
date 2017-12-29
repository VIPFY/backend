"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _defineProperty2 = require("babel-runtime/helpers/defineProperty");

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _permissions = require("../../helpers/permissions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  setDeleteStatus: _permissions.requiresAuth.createResolver(function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(parent, _ref2, _ref3) {
      var id = _ref2.id,
          model = _ref2.model,
          type = _ref2.type;
      var models = _ref3.models;
      var messageExists, deleted;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return models[model].findById(id);

            case 2:
              messageExists = _context.sent;

              if (!messageExists) {
                _context.next = 16;
                break;
              }

              _context.prev = 4;
              _context.next = 7;
              return models[model].update((0, _defineProperty3.default)({}, type, true), { where: { id: id } });

            case 7:
              deleted = _context.sent;
              return _context.abrupt("return", {
                ok: true
              });

            case 11:
              _context.prev = 11;
              _context.t0 = _context["catch"](4);
              return _context.abrupt("return", {
                ok: false,
                error: _context.t0.message
              });

            case 14:
              _context.next = 17;
              break;

            case 16:
              return _context.abrupt("return", {
                ok: false,
                error: "Message doesn't exist!"
              });

            case 17:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, undefined, [[4, 11]]);
    }));

    return function (_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }()),

  setReadtime: _permissions.requiresAuth.createResolver(function () {
    var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(parent, _ref5, _ref6) {
      var id = _ref5.id,
          model = _ref5.model;
      var models = _ref6.models;
      var read, now;
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.prev = 0;
              _context2.next = 3;
              return models[model].findById(id);

            case 3:
              read = _context2.sent;

              if (read.readtime) {
                _context2.next = 11;
                break;
              }

              now = Date.now();
              _context2.next = 8;
              return models[model].update({ readtime: now }, { where: { id: id } });

            case 8:
              return _context2.abrupt("return", {
                ok: true,
                message: now
              });

            case 11:
              return _context2.abrupt("return", {
                ok: false,
                error: "Message already read"
              });

            case 12:
              _context2.next = 17;
              break;

            case 14:
              _context2.prev = 14;
              _context2.t0 = _context2["catch"](0);
              return _context2.abrupt("return", {
                ok: false,
                error: _context2.t0.message
              });

            case 17:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, undefined, [[0, 14]]);
    }));

    return function (_x4, _x5, _x6) {
      return _ref4.apply(this, arguments);
    };
  }()),

  sendMessage: _permissions.requiresAuth.createResolver(function () {
    var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(parent, _ref8, _ref9) {
      var fromuser = _ref8.fromuser,
          touser = _ref8.touser,
          message = _ref8.message;
      var models = _ref9.models;
      var sender, receiver, save;
      return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return models.User.findById(fromuser);

            case 2:
              sender = _context3.sent;
              _context3.next = 5;
              return models.User.findById(touser);

            case 5:
              receiver = _context3.sent;

              if (!(!sender || !receiver)) {
                _context3.next = 10;
                break;
              }

              return _context3.abrupt("return", {
                ok: false,
                error: "User doesn't exist!"
              });

            case 10:
              if (!(sender.id == receiver.id)) {
                _context3.next = 14;
                break;
              }

              return _context3.abrupt("return", {
                ok: false,
                error: "Sender and Receiver can't be the same User!"
              });

            case 14:
              if (!(message && sender && receiver)) {
                _context3.next = 27;
                break;
              }

              _context3.prev = 15;
              _context3.next = 18;
              return models.Notification.create({
                fromuser: fromuser,
                touser: touser,
                type: 1,
                message: message
              });

            case 18:
              save = _context3.sent;
              return _context3.abrupt("return", {
                ok: true,
                message: message
              });

            case 22:
              _context3.prev = 22;
              _context3.t0 = _context3["catch"](15);
              return _context3.abrupt("return", {
                ok: false,
                error: _context3.t0.message
              });

            case 25:
              _context3.next = 28;
              break;

            case 27:
              return _context3.abrupt("return", {
                ok: false,
                error: "Empty Message!"
              });

            case 28:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, undefined, [[15, 22]]);
    }));

    return function (_x7, _x8, _x9) {
      return _ref7.apply(this, arguments);
    };
  }())
};