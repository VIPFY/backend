"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createSubscription = exports.deleteOrganization = exports.fetchOrganization = exports.addOrganization = undefined;

var _pipedrive = require("pipedrive");

var _loginData = require("../login-data");

var _axios = require("axios");

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Connect to Pipedrive via their custom library
var pipedrive = new _pipedrive.Client(_loginData.PIPEDRIVE_KEY, { strictMode: true });

var addOrganization = exports.addOrganization = function addOrganization(organization) {
  pipedrive.Organizations.add(organization, function (err, res) {
    if (err) throw err;

    console.log(res);
  });
};

var fetchOrganization = exports.fetchOrganization = function fetchOrganization(organization) {
  pipedrive.Organizations.get(organization.id, function (err, res) {
    if (err) throw err;

    console.log(res);
  });
};

var deleteOrganization = exports.deleteOrganization = function deleteOrganization(organization) {
  pipedrive.Organizations.remove(organization.id, function (err, res) {
    if (err) throw err;

    console.log(res);
  });
};

var createSubscription = exports.createSubscription = function createSubscription(_ref) {
  var initiator = _ref.initiator,
      primaryUser = _ref.primaryUser,
      company = _ref.company,
      order = _ref.order;

  var options = {
    method: "POST",
    url: "https://provisioning-api.pipedrive.com/v1/subscriptions",
    // baseURL: "https://provisioning-api.pipedrive.com/v1",
    headers: {
      "Content-type": "application/json",
      Authorization: _loginData.PIPEDRIVE_KEY
    },
    data: {
      initiator: initiator,
      primaryUser: primaryUser,
      company: company,
      order: order
    }
  };

  (0, _axios2.default)(options).then(function (res) {
    return console.log(res);
  }).catch(function (err) {
    console.log("Error " + err.response.status + ": " + err.response.statusText);
    console.log("Headers:", err.response.headers);
  });
};