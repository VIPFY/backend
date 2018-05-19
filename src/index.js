/*
* This is the main component which has the server. It imports all models,
* resolvers, creates the schema with them, uses middleware for the app and
* establishes the connection to the database before starting the server
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
import { SECRET, SECRET_TWO } from "./login-data";
import typeDefs from "./schemas/schema";
import resolvers from "./resolvers/resolvers";
import models from "./models";
import { authMiddleware, fileMiddleware, loggingMiddleWare } from "./middleware";
import { refreshTokens } from "./helpers/auth";

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
export const schema = makeExecutableSchema({ typeDefs, resolvers });

// Enable our Frontend running on localhost:3000 to access the Backend
const corsOptions = {
  origin:
    ENVIRONMENT == "production"
      ? ["https://vipfy.com", "https://www.vipfy.com", "https://dev.vipfy.com"]
      : "http://localhost:3000",
  credentials: true // <-- REQUIRED backend setting
};

app.use(authMiddleware);
app.use(cors(corsOptions));
app.use(loggingMiddleWare);
app.use(
  "/graphql",
  bodyParser.json(),
  fileMiddleware,
  graphqlExpress(({ headers }) => {
    const token = headers["x-token"];

    return {
      schema,
      context: {
        models,
        token,
        SECRET,
        SECRET_TWO
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
                      SECRET_TWO
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
