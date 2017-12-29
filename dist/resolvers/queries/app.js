"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  allApps: function allApps(parent, _ref, _ref2) {
    var first = _ref.first;
    var models = _ref2.models;

    if (first) {
      return models.App.findAll().then(function (res) {
        return res.slice(0, first);
      });
    } else return models.App.findAll();
  },

  allAppImages: function allAppImages(parent, args, _ref3) {
    var models = _ref3.models;
    return models.AppImage.findAll();
  },

  fetchApp: function fetchApp(parent, _ref4, _ref5) {
    var name = _ref4.name;
    var models = _ref5.models;
    return models.App.findOne({ where: { name: name } });
  },

  fetchAppImages: function fetchAppImages(parent, _ref6, _ref7) {
    var appid = _ref6.appid;
    var models = _ref7.models;
    return models.AppImage.findAll({ where: { appid: appid } });
  },

  allDevelopers: function allDevelopers(parent, args, _ref8) {
    var models = _ref8.models;
    return models.Developer.findAll();
  },

  fetchDeveloper: function fetchDeveloper(parent, _ref9, _ref10) {
    var id = _ref9.id;
    var models = _ref10.models;
    return models.Developer.findById(id);
  }
};