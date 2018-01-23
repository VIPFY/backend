"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _loginData = require("../login-data");

exports.default = function (email, hash) {
  var Mailjet = require("node-mailjet").connect(_loginData.MAILJET_KEY, _loginData.MAILJET_SECRET);

  var con_link = "https://vipfy-148316.appspot.com/signup/" + hash;
  var options = {
    FromEmail: "office@vipfy.com",
    FromName: "Vipfy Office",
    "MJ-TemplateID": "197442",
    "MJ-TemplateLanguage": "true",
    Recipients: [{ Email: email }],
    Vars: { confirmation_link: con_link }
  };

  var request = Mailjet.post("send").request(options);

  request.then(function (res) {
    console.log(res.body);
  }).catch(function (err) {
    console.log(err.statusCode);
    console.log(err);
  });
};