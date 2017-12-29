"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _soap = require("soap");

var _soap2 = _interopRequireDefault(_soap);

var _loginData = require("../login-data");

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var apiWSDL = "https://api-ote-2.domaindiscount24.com:4424/?wsdl";
var auth = {
  params: {
    reseller: _loginData.DD24_KEY,
    password: _loginData.DD24_SECRET
  }
};

exports.default = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(command, parameter) {
    var args, properCommand, result;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            // Copy bad inside good, otherwise => End of days!
            args = _lodash2.default.merge(auth, { params: parameter });
            // Eleminate copying mistakes

            properCommand = command + "Async";
            _context.next = 4;
            return _soap2.default.createClientAsync(apiWSDL).then(function (client) {
              return client[properCommand](args).then(function (res) {
                console.log(res[command + "Result"]);
                return res[command + "Result"];
              }).catch(function (err) {
                console.log(err);
                return err;
              });
            }).catch(function (err) {
              return console.log(err);
            });

          case 4:
            result = _context.sent;
            return _context.abrupt("return", result);

          case 6:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();