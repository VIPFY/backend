/*
* This is the main component which has the server. It imports all models,
* resolvers, creates the schema with them, uses middleware for the app and
* establishes the connection to the database before starting the server
*/

import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import fs from "fs";
import https from "https";
import http from "http";
import jwt from "jsonwebtoken";

// To create the GraphQl functions
import { graphiqlExpress, graphqlExpress } from "apollo-server-express";
import { makeExecutableSchema } from "graphql-tools";
import { execute, subscribe } from "graphql";
import { SubscriptionServer } from "subscriptions-transport-ws";
import { createContext } from "dataloader-sequelize";
import models from "@vipfy-private/sequelize-setup";
import * as Services from "@vipfy-private/services";
import typeDefs from "./schemas/schema";
import resolvers from "./resolvers/resolvers";
import { authMiddleware, fileMiddleware, loggingMiddleWare } from "./middleware";
import { refreshTokens } from "./helpers/auth";
import logger from "./loggers";
import { formatError, AuthError } from "./errors";
import { attachmentLink } from "./services/gcloud";

Services.setLogger(logger);

const app = express();
const {
  ENVIRONMENT,
  TOKEN_SET,
  SSL_KEY,
  SSL_CERT,
  SECRET,
  SECRET_TWO,
  TOKEN_DEVELOPMENT
} = process.env;
const secure = ENVIRONMENT == "production" ? "s" : "";
const PORT = process.env.PORT || 4000;
let server;

if (!SECRET || !SECRET_TWO) {
  throw new Error("No secret set!");
}

// We don't need certificates and https for development
if (ENVIRONMENT == "production") {
  const httpsOptions = {
    key: fs.readFileSync(SSL_KEY || "/etc/letsencrypt/live/vipfy.com/privkey.pem"),
    cert: fs.readFileSync(SSL_CERT || "/etc/letsencrypt/live/vipfy.com/cert.pem")
  };

  server = https.createServer(httpsOptions, app);
} else {
  server = http.createServer(app);
}

// eslint-disable-next-line
export const schema = makeExecutableSchema({ typeDefs, resolvers });
// eslint-disable-next-line
const seqContext = createContext(models.sequelize);
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
  graphqlExpress(({ headers, ip }) => {
    const token = headers["x-token"];

    return {
      schema,
      formatError,
      context: {
        models,
        token: TOKEN_SET ? TOKEN_DEVELOPMENT : token,
        logger,
        SECRET,
        SECRET_TWO,
        ip
      },
      debug: ENVIRONMENT == "development"
    };
  })
);

// Enable Graphiql Interface
if (ENVIRONMENT != "production") {
  app.use(
    "/graphiql",
    graphiqlExpress({
      endpointURL: "/graphql",
      subscriptionsEndpoint: `ws${secure}://localhost:${PORT}/subscriptions`
    })
  );
}

// The home route is currently empty
app.get("/", (req, res) =>
  res.send(`Go to http${secure}://localhost:${PORT}/graphiql for the Interface`)
);

// The bodyParser is needed here (again), so that the post can receive the content.
app.use(bodyParser.json());
app.post("/download", async (req, res) => {
  try {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(403).send({ error: "Not Authenticated!" });
    }

    await attachmentLink(req.body.id, res);
    return res.status(200);
  } catch (err) {
    return res.status(500).send({ error: err });
  }
});

if (ENVIRONMENT != "testing") {
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
          if (token && token != "null") {
            try {
              jwt.verify(token, SECRET);

              return { models, token };
            } catch (err) {
              if (err.name == "TokenExpiredError") {
                console.log("Token expired in Subscription");
                const newTokens = await refreshTokens(refreshToken, models, SECRET, SECRET_TWO);

                return { models, token: newTokens.token };
              } else {
                throw new AuthError({
                  message: err.message,
                  internalData: { error: "Subscription Error" }
                });
              }
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
  });
}
