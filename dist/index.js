"use strict";

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _express = require("express");

var _express2 = _interopRequireDefault(_express);

var _bodyParser = require("body-parser");

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _graphqlServerExpress = require("graphql-server-express");

var _graphqlTools = require("graphql-tools");

var _cors = require("cors");

var _cors2 = _interopRequireDefault(_cors);

var _jsonwebtoken = require("jsonwebtoken");

var _jsonwebtoken2 = _interopRequireDefault(_jsonwebtoken);

var _schema = require("./schemas/schema");

var _schema2 = _interopRequireDefault(_schema);

var _resolvers = require("./resolvers/resolvers");

var _resolvers2 = _interopRequireDefault(_resolvers);

var _models = require("./models");

var _models2 = _interopRequireDefault(_models);

var _loginData = require("./login-data");

var _auth = require("./services/auth");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var request = require("request");
//To create the GraphQl functions

var schema = (0, _graphqlTools.makeExecutableSchema)({
  typeDefs: _schema2.default,
  resolvers: _resolvers2.default
});

var app = (0, _express2.default)();
var PORT = process.env.PORT || 4000;

// Middleware to authenticate the user. If the user sends the authorization token
// he receives after a successful login, everything will be fine.
var authMiddleware = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(req, res, next) {
    var token, _jwt$verify, user, refreshToken, newTokens;

    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            token = req.headers["x-token"];

            if (!token) {
              _context.next = 15;
              break;
            }

            _context.prev = 2;
            _jwt$verify = _jsonwebtoken2.default.verify(token, _loginData.SECRET), user = _jwt$verify.user;

            req.user = user;
            _context.next = 15;
            break;

          case 7:
            _context.prev = 7;
            _context.t0 = _context["catch"](2);

            //If the token has expired, we use the refreshToken to assign new ones
            refreshToken = req.headers["x-refresh-token"];
            _context.next = 12;
            return (0, _auth.refreshTokens)(token, refreshToken, _models2.default, _loginData.SECRET, _loginData.SECRETTWO);

          case 12:
            newTokens = _context.sent;


            if (newTokens.token && newTokens.refreshToken) {
              res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
              res.set("x-token", newTokens.token);
              res.set("x-refresh-token", newTokens.refreshToken);
            }
            req.user = newTokens.user;

          case 15:
            next();

          case 16:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, undefined, [[2, 7]]);
  }));

  return function authMiddleware(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();
app.use(authMiddleware);

// Enable our Frontend running on localhost:3000 to access the Backend
var corsOptions = {
  origin: "http://localhost:3000",
  credentials: true // <-- REQUIRED backend setting
};
app.use((0, _cors2.default)(corsOptions));

//Enable to Graphiql Interface
app.use("/graphiql", (0, _graphqlServerExpress.graphiqlExpress)({
  endpointURL: "/graphql"
}));

app.use("/graphql", _bodyParser2.default.json(), (0, _graphqlServerExpress.graphqlExpress)(function (req) {
  return {
    schema: schema,
    context: {
      models: _models2.default,
      user: req.user,
      SECRET: _loginData.SECRET,
      SECRETTWO: _loginData.SECRETTWO
    }
  };
}));

//The home route is currently empty
app.get("/", function (req, res) {
  return res.send("Go to http://localhost:" + PORT + "/graphiql for the Interface");
});

//Sync our database and run the app afterwards
_models2.default.sequelize.sync().then(function () {
  return app.listen(PORT, function () {
    console.log("Server running on port " + PORT);
    console.log("Go to http://localhost:" + PORT + "/graphiql for the Interface");
  });
}).catch(function (err) {
  return console.log(err);
});