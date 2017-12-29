"use strict";

var _slicedToArray2 = require("babel-runtime/helpers/slicedToArray");

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _client = require("@sendgrid/client");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import {SENDGRID_KEY} from "../login-data";

//client.setApiKey(SENDGRID_KEY);
var args = {
  method: "GET",
  url: "/v3/api_keys"
  //   body: {
  //     "email": "John@example.com",
  // "ips": [
  //   "1.1.1.1",
  //   "2.2.2.2"
  // ],
  // "password": "johns_password",
  // "username": "John@example.com"
  //   }
};

_client.client.request(args).then(function (_ref) {
  var _ref2 = (0, _slicedToArray3.default)(_ref, 2),
      response = _ref2[0],
      body = _ref2[1];

  console.log(response.statusCode);
  console.log(response.body);
});