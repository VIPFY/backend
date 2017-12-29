"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  allReviews: function allReviews(parent, args, _ref) {
    var models = _ref.models;
    return models.Review.findAll();
  },

  fetchReview: function fetchReview(parent, args, _ref2) {
    var models = _ref2.models;
    return models.Review.findAll({ where: { appid: args.appid } });
  },

  fetchPlans: function fetchPlans(parent, _ref3, _ref4) {
    var appid = _ref3.appid;
    var models = _ref4.models;
    return models.Plan.findAll({ where: { appid: appid } });
  },

  fetchPrice: function fetchPrice(parent, _ref5, _ref6) {
    var appid = _ref5.appid;
    var models = _ref6.models;
    return models.Plan.findOne({ where: { appid: appid } });
  }
};