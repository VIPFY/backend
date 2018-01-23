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

var _sequelize = require("sequelize");

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  fetchMessages: _permissions.requiresAuth.createResolver(function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(parent, _ref2, _ref3) {
      var id = _ref2.id,
          read = _ref2.read;
      var models = _ref3.models;
      var users, apps, result;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              users = void 0;
              apps = void 0;

              if (!(read === true)) {
                _context.next = 11;
                break;
              }

              _context.next = 5;
              return models.Notification.findAll({
                where: {
                  touser: id,
                  deleted: false,
                  readtime: (0, _defineProperty3.default)({}, _sequelize.Op.not, null)
                },
                order: [["sendtime", "DESC"]]
              });

            case 5:
              users = _context.sent;
              _context.next = 8;
              return models.AppNotification.findAll({
                where: {
                  touser: id,
                  deleted: false,
                  readtime: (0, _defineProperty3.default)({}, _sequelize.Op.not, null)
                },
                order: [["sendtime", "DESC"]]
              });

            case 8:
              apps = _context.sent;
              _context.next = 26;
              break;

            case 11:
              if (!(read === false)) {
                _context.next = 20;
                break;
              }

              _context.next = 14;
              return models.Notification.findAll({
                where: {
                  touser: id,
                  deleted: false,
                  readtime: (0, _defineProperty3.default)({}, _sequelize.Op.eq, null)
                },
                order: [["sendtime", "DESC"]]
              });

            case 14:
              users = _context.sent;
              _context.next = 17;
              return models.AppNotification.findAll({
                where: {
                  touser: id,
                  deleted: false,
                  readtime: (0, _defineProperty3.default)({}, _sequelize.Op.eq, null)
                },
                order: [["sendtime", "DESC"]]
              });

            case 17:
              apps = _context.sent;
              _context.next = 26;
              break;

            case 20:
              _context.next = 22;
              return models.Notification.findAll({
                where: { touser: id, deleted: false },
                order: [["sendtime", "DESC"]]
              });

            case 22:
              users = _context.sent;
              _context.next = 25;
              return models.AppNotification.findAll({
                where: { touser: id, deleted: false },
                order: [["sendtime", "DESC"]]
              });

            case 25:
              apps = _context.sent;

            case 26:
              result = [];

              users.map(function (user) {
                return result.push(user);
              });
              apps.map(function (app) {
                return result.push(app);
              });

              return _context.abrupt("return", _lodash2.default.orderBy(result, "sendtime", "desc"));

            case 30:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, undefined);
    }));

    return function (_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }())
};