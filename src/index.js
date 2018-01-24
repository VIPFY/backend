import express from "express";
import bodyParser from "body-parser";
import { graphiqlExpress, graphqlExpress } from "apollo-server-express";
import { makeExecutableSchema } from "graphql-tools";
import https from "https";
import http from "http";
import { execute, subscribe } from "graphql";
import { SubscriptionServer } from "subscriptions-transport-ws";
import cors from "cors";
import jwt from "jsonwebtoken";
//To create the GraphQl functions
import typeDefs from "./schemas/schema";
import resolvers from "./resolvers/resolvers";
import models from "./models";
import { SECRET, SECRETTWO } from "./login-data";
import { refreshTokens } from "./services/auth";
import { PORT } from "./constants";
import fs from "fs";

const app = express();
const secure = process.env.DEV ? "" : "s";
let server;
// We don't need certificates and https for development
if (!process.env.DEV) {
  const https_options = {
    key: fs.readFileSync("/etc/letsencrypt/live/vipfy.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/vipfy.com/cert.pem")
  };

  server = https.createServer(https_options, app);
} else {
  server = http.createServer(app);
}

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
      const { user } = jwt.verify(token, SECRET);
      req.user = user;
    } catch (err) {
      //If the token has expired, we use the refreshToken to assign new ones
      const refreshToken = req.headers["x-refresh-token"];
      const newTokens = await refreshTokens(
        token,
        refreshToken,
        models,
        SECRET,
        SECRETTWO
      );

      if (newTokens.token && newTokens.refreshToken) {
        res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
        res.set("x-token", newTokens.token);
        res.set("x-refresh-token", newTokens.refreshToken);
      }
      req.user = newTokens.user;
    }
  }
  next();
};
app.use(authMiddleware);

// Enable our Frontend running on localhost:3000 to access the Backend
const corsOptions = {
  origin: true,
  credentials: true // <-- REQUIRED backend setting
};
// app.use(cors(corsOptions));

app.use(
  "/graphql",
  bodyParser.json(),
  graphqlExpress(req => ({
    schema,
    context: {
      models,
      user: req.user,
      SECRET,
      SECRETTWO
    }
  }))
);

//Enable to Graphiql Interface
app.use(
  "/graphiql",
  graphiqlExpress({
    endpointURL: "/graphql"
  })
);

//The home route is currently empty
app.get("/", (req, res) =>
  res.send(`Go to http${secure}://localhost:${PORT}/graphiql for the Interface`)
);

models.sequelize
  .sync()
  .then(() =>
    server.listen(PORT, () => {
      if (process.env.LOGGING) {
        console.log(`Server running on port ${PORT}`);
        console.log(
          `Go to http${secure}://localhost:${PORT}/graphiql for the Interface`
        );
      }

      new SubscriptionServer(
        {
          execute,
          subscribe,
          schema
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
    server.listen(PORT + 1);
    return;
  });
