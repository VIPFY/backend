"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.requiresAdmin = exports.requiresAuth = undefined;

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//Higher order component
var createResolver = function createResolver(resolver) {
  var baseResolver = resolver;
  baseResolver.createResolver = function (childResolver) {
    var newResolver = function () {
      var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(parent, args, context, info) {
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return resolver(parent, args, context, info);

              case 2:
                return _context.abrupt("return", childResolver(parent, args, context, info));

              case 3:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, undefined);
      }));

      return function newResolver(_x, _x2, _x3, _x4) {
        return _ref.apply(this, arguments);
      };
    }();
    return createResolver(newResolver);
  };
  return baseResolver;
};

//Check whether the user is authenticated
var requiresAuth = exports.requiresAuth = createResolver(function (parent, args, _ref2) {
  var user = _ref2.user;

  if (!user || !user.id) {
    throw new Error("Not authenticated!");
  }
});

//These functions can be nested. Here it checks first whether an user
//is authenticated and then if he has admin status.
var requiresAdmin = exports.requiresAdmin = requiresAuth.createResolver(function (parent, args, context) {
  if (!context.user.isAdmin) {
    throw new Error("Requires admin privileges");
  }
});