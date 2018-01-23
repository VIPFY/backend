"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _dd = require("../../services/dd24");

var _dd2 = _interopRequireDefault(_dd);

var _permissions = require("../../helpers/permissions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  domainCommands: _permissions.requiresAuth.createResolver(function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(parent, _ref2, _ref3) {
      var command = _ref2.command,
          params = _ref2.params,
          agb = _ref2.agb;
      var models = _ref3.models;
      var result;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.prev = 0;

              if (!(command != "AddDomain" || command == "AddDomain" && agb)) {
                _context.next = 9;
                break;
              }

              _context.next = 4;
              return (0, _dd2.default)(command, params);

            case 4:
              result = _context.sent;

              console.log(result);
              return _context.abrupt("return", result);

            case 9:
              return _context.abrupt("return", {
                error: "AGB's not accepted!",
                code: 600,
                description: ""
              });

            case 10:
              _context.next = 15;
              break;

            case 12:
              _context.prev = 12;
              _context.t0 = _context["catch"](0);
              return _context.abrupt("return", {
                code: 404,
                error: _context.t0.message
              });

            case 15:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, undefined, [[0, 12]]);
    }));

    return function (_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }())
};