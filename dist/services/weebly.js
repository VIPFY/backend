"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

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

exports.default = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(callType, endpoint, requestData) {
    var requestString, requestHash, vString, options;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            //The request string consists of:
            // Type of call (for example POST or PUT)
            // The endpoint URL (for example, user/234256/loginLink)
            // Any request data (for example, { 'plan_id': 34 }).
            // (Don't include data in the hash if the request doesn't require it)
            requestString = callType + "\n" + endpoint + "\n" + (0, _stringify2.default)(requestData);


            console.log(requestString);
            _context.next = 4;
            return _createHmac2.default.generateHmac(requestString, _loginData.WEEBLY_SECRET);

          case 4:
            requestHash = _context.sent;

            console.log(requestHash);

            vString = _createHmac2.default.validateHmac(requestHash, requestString, _loginData.WEEBLY_SECRET);
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
              return console.log(res);
            }).catch(function (err) {
              console.log("Error: " + err.response.status);
              console.log(err.response.statusText);
              //console.log(err);
            });

          case 9:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function (_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();