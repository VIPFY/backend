"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createWeeblyUser = exports.test = exports.createRequestHash = undefined;

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _stringify = require("babel-runtime/core-js/json/stringify");

var _stringify2 = _interopRequireDefault(_stringify);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _loginData = require("../login-data");

var _createHmac = require("../helpers/createHmac");

var _createHmac2 = _interopRequireDefault(_createHmac);

var _axios = require("axios");

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createRequestHash = exports.createRequestHash = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(callType, endpoint, requestData) {
    var requestString, _requestHash;

    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            requestString = callType + "\n" + endpoint + "\n" + (0, _stringify2.default)(requestData);
            _context.prev = 1;
            _context.next = 4;
            return _createHmac2.default.generateHmac(requestString, _loginData.WEEBLY_SECRET);

          case 4:
            _requestHash = _context.sent;
            return _context.abrupt("return", _requestHash);

          case 8:
            _context.prev = 8;
            _context.t0 = _context["catch"](1);
            return _context.abrupt("return", _context.t0);

          case 11:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, undefined, [[1, 8]]);
  }));

  return function createRequestHash(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();

var test = exports.test = function () {
  var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(callType, endpoint, requestData) {
    var requestString, requestHash, vString, options;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            //The request string consists of:
            // Type of call (for example POST or PUT)
            // The endpoint URL (for example, user/234256/loginLink)
            // Any request data (for example, { 'plan_id': 34 }).
            // (Don't include data in the hash if the request doesn't require it)
            requestString = callType + "\n" + endpoint + "\n" + (0, _stringify2.default)(requestData);
            _context2.next = 3;
            return _createHmac2.default.generateHmac(requestString, _loginData.WEEBLY_SECRET);

          case 3:
            requestHash = _context2.sent;
            vString = _createHmac2.default.validateHmac(requestHash, requestString, _loginData.WEEBLY_SECRET);


            if (vString) {
              options = {
                method: callType,
                url: "" + endpoint,
                baseURL: "https://api.weeblycloud.com/",
                headers: {
                  "Content-type": "application/json",
                  "X-Public-Key": _loginData.WEEBLY_KEY,
                  "X-Signed-Request-Hash": requestHash
                },
                data: (0, _stringify2.default)(requestData)
              };


              (0, _axios2.default)(options).then(function (res) {
                return console.log(res.status, res.statusText, res.data);
              }).catch(function (err) {
                console.log("Error: " + err.response.status);
                console.log(err.response.statusText);
              });
            } else {
              console.log("String could not be verified!");
            }

          case 6:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function test(_x4, _x5, _x6) {
    return _ref2.apply(this, arguments);
  };
}();

var createWeeblyUser = exports.createWeeblyUser = function createWeeblyUser(email) {
  var requestData = {
    language: "en",
    test_mode: true,
    email: email
  };

  var options = {
    method: "POST",
    url: "user",
    baseURL: "https://api.weeblycloud.com/",
    headers: {
      "Content-type": "application/json",
      "X-Public-Key": _loginData.WEEBLY_KEY,
      "X-Signed-Request-Hash": requestHash
    },
    data: (0, _stringify2.default)(requestData)
  };
};