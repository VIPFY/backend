/*
This is the main component which has the server. It imports all models,
resolvers, creates the schema with them, defines middleware for the app and
establishes the connection to the database before starting the server
*/

import express from "express";
import bodyParser from "body-parser";
import https from "https";
import http from "http";
import cors from "cors";
import jwt from "jsonwebtoken";
import fs from "fs";

// To create the GraphQl functions

import { graphiqlExpress, graphqlExpress } from "apollo-server-express";
import { makeExecutableSchema } from "graphql-tools";
import { execute, subscribe } from "graphql";
import { SubscriptionServer } from "subscriptions-transport-ws";
import { SECRET, SECRETTWO } from "./login-data";
import { refreshTokens } from "./services/auth";
import typeDefs from "./schemas/schema";
import resolvers from "./resolvers/resolvers";
import models from "./models";

const app = express();
const ENVIRONMENT = process.env.ENVIRONMENT;
const secure = ENVIRONMENT == "production" ? "s" : "";
const PORT = process.env.PORT || 4000;
let server;
// We don't need certificates and https for development
if (ENVIRONMENT == "production") {
  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY || "/etc/letsencrypt/live/vipfy.com/privkey.pem"),
    cert: fs.readFileSync(process.env.SSL_CERT || "/etc/letsencrypt/live/vipfy.com/cert.pem")
  };

  server = https.createServer(httpsOptions, app);
} else {
  server = http.createServer(app);
}
// eslint-disable-next-line
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  logger: process.env.LOGGING ? { log: e => console.log(e) } : false
});

// Middleware to authenticate the user. If the user sends the authorization token
// he receives after a successful login, everything will be fine.
const authMiddleware = async (req, res, next) => {
  const token = req.headers["x-token"];
  if (token) {
    try {
      const { user } = await jwt.verify(token, SECRET);
      req.user = user;
    } catch (err) {
      if (err.name == "TokenExpiredError") {
        // If the token has expired, we use the refreshToken to assign new ones
        const refreshToken = req.headers["x-refresh-token"];
        const newTokens = await refreshTokens(token, refreshToken, models, SECRET, SECRETTWO);

        if (newTokens.token && newTokens.refreshToken) {
          res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
          res.set("x-token", newTokens.token);
          res.set("x-refresh-token", newTokens.refreshToken);
        }
        req.user = newTokens.user;
      } else {
        console.log(err);
        req.headers["x-token"] = false;
      }
    }
  }
  next();
};
app.use(authMiddleware);

// Enable our Frontend running on localhost:3000 to access the Backend
const corsOptions = {
  origin:
    ENVIRONMENT == "production"
      ? ["https://vipfy.com", "https://www.vipfy.com", "https://dev.vipfy.com"]
      : "http://localhost:3000",
  credentials: true // <-- REQUIRED backend setting
};
app.use(cors(corsOptions));

app.use(
  "/graphql",
  bodyParser.json(),
  graphqlExpress(({ headers, user }) => {
    const token = headers["x-token"];
    return {
      schema,
      context: {
        models,
        token,
        // token:
        // eslint-disable-next-line
        //   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjo3NH0sImlhdCI6MTUxNzY3MzE5NiwiZXhwIjoxNTE3NzE2Mzk2fQ.5Tlsrg6F9UuwcKYZu21JFqVlEPhRKJZVsWXwuJlVgs4",
        user,
        SECRET,
        SECRETTWO
      },
      debug: ENVIRONMENT == "development"
    };
  })
);

// Enable to Graphiql Interface
if (ENVIRONMENT != "production") {
  app.use(
    "/graphiql",
    graphiqlExpress({
      endpointURL: "/graphql",
      subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`
    })
  );
}
// The home route is currently empty
app.get("/", (req, res) =>
  res.send(`Go to http${secure}://localhost:${PORT}/graphiql for the Interface`)
);

if (ENVIRONMENT != "testing") {
  models.sequelize
    .sync()
    .then(() =>
      server.listen(PORT, () => {
        if (process.env.LOGGING) {
          console.log(`Server running on port ${PORT}`);
          console.log(`Go to http${secure}://localhost:${PORT}/graphiql for the Interface`);
        }

        new SubscriptionServer(
          {
            execute,
            subscribe,
            schema,
            onConnect: async ({ token, refreshToken }) => {
              if (token && refreshToken) {
                try {
                  jwt.verify(token, SECRET);
                  return { models, token };
                } catch (err) {
                  if (err.name == "TokenExpiredError") {
                    const newTokens = await refreshTokens(
                      token,
                      refreshToken,
                      models,
                      SECRET,
                      SECRETTWO
                    );
                    return { models, token: newTokens.token };
                  }
                  return {};
                }
              }
              return {};
            }
          },
          {
            server,
            path: "/subscriptions"
          }
        );
      })
    )
    .catch(err => {
      console.log(err);
      server.close();
    });
}
