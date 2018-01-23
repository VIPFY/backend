"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _permissions = require("../../helpers/permissions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  writeReview: _permissions.requiresAuth.createResolver(function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(parent, _ref2, _ref3) {
      var userid = _ref2.userid,
          appid = _ref2.appid,
          stars = _ref2.stars,
          text = _ref2.text;
      var models = _ref3.models;
      var app, user, review;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return models.App.findById(appid);

            case 2:
              app = _context.sent;
              _context.next = 5;
              return models.User.findById(userid);

            case 5:
              user = _context.sent;

              if (!(!app || !user)) {
                _context.next = 10;
                break;
              }

              return _context.abrupt("return", {
                ok: false,
                error: "App or User doesn't exist!"
              });

            case 10:
              if (!(stars > 5 || stars < 1)) {
                _context.next = 14;
                break;
              }

              return _context.abrupt("return", {
                ok: false,
                error: "Rating must be between 1 and 5 stars!"
              });

            case 14:
              _context.prev = 14;
              _context.next = 17;
              return models.Review.create({
                stars: stars,
                reviewtext: text,
                userid: userid,
                appid: appid
              });

            case 17:
              review = _context.sent;
              return _context.abrupt("return", {
                ok: true,
                id: review.id
              });

            case 21:
              _context.prev = 21;
              _context.t0 = _context["catch"](14);
              return _context.abrupt("return", {
                ok: false,
                error: _context.t0.message
              });

            case 24:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, undefined, [[14, 21]]);
    }));

    return function (_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }()),

  rateReview: _permissions.requiresAuth.createResolver(function () {
    var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(parent, _ref5, _ref6) {
      var reviewid = _ref5.reviewid,
          userid = _ref5.userid,
          balance = _ref5.balance;
      var models = _ref6.models;
      var commenter, review, changeRating, rate, changing;
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return models.User.findById(userid);

            case 2:
              commenter = _context2.sent;
              _context2.next = 5;
              return models.Review.findById(reviewid);

            case 5:
              review = _context2.sent;
              _context2.next = 8;
              return models.ReviewHelpful.findOne({
                where: {
                  reviewid: reviewid,
                  userid: userid
                }
              });

            case 8:
              changeRating = _context2.sent;

              if (review) {
                _context2.next = 13;
                break;
              }

              return _context2.abrupt("return", {
                ok: false,
                error: "Review doesn't exist!"
              });

            case 13:
              if (commenter) {
                _context2.next = 17;
                break;
              }

              return _context2.abrupt("return", {
                ok: false,
                error: "User doesn't exist!"
              });

            case 17:
              if (changeRating) {
                _context2.next = 30;
                break;
              }

              _context2.prev = 18;
              _context2.next = 21;
              return models.ReviewHelpful.create({
                balance: balance,
                reviewid: reviewid,
                userid: userid
              });

            case 21:
              rate = _context2.sent;
              return _context2.abrupt("return", {
                ok: true,
                balance: balance
              });

            case 25:
              _context2.prev = 25;
              _context2.t0 = _context2["catch"](18);
              return _context2.abrupt("return", {
                ok: false,
                error: _context2.t0.message
              });

            case 28:
              _context2.next = 42;
              break;

            case 30:
              if (!(changeRating.balance == balance)) {
                _context2.next = 32;
                break;
              }

              return _context2.abrupt("return", {
                ok: false,
                error: "This is the same value: " + balance
              });

            case 32:
              _context2.prev = 32;
              _context2.next = 35;
              return models.ReviewHelpful.update({ balance: balance }, {
                where: {
                  userid: userid,
                  reviewid: reviewid
                }
              });

            case 35:
              changing = _context2.sent;
              return _context2.abrupt("return", {
                ok: true,
                balance: balance
              });

            case 39:
              _context2.prev = 39;
              _context2.t1 = _context2["catch"](32);
              return _context2.abrupt("return", {
                ok: false,
                error: _context2.t1.message
              });

            case 42:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, undefined, [[18, 25], [32, 39]]);
    }));

    return function (_x4, _x5, _x6) {
      return _ref4.apply(this, arguments);
    };
  }())
};