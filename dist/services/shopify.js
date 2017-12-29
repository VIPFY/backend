"use strict";

var _axios = require("axios");

var _axios2 = _interopRequireDefault(_axios);

var _loginData = require("../login-data");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var config = {
  method: "get",
  url: "https://" + _loginData.SHOPIFY_KEY + ":" + _loginData.SHOPIFY_SECRET + "@vipfy-test.myshopify.com/admin/products.json"
  // data: {
  //   product: {
  //     title: "App6",
  //     vendor: "User1",
  //     product_type: "App"
  //   }
  // }
};

createCompany = function createCompany() {
  (0, _axios2.default)(config).then(function (res) {
    return console.log(res.data);
  }).catch(function (err) {
    return console.log(err.response.data);
  });
};

(0, _axios2.default)(config).then(function (res) {
  return console.log(res.data);
}).catch(function (err) {
  return console.log(err.response.data);
});