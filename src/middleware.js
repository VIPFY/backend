/*
 * Several Middleware for the app. authMiddleware validates tokens received from the
 * client and destroys them otherwise and loggingMiddleWare logs incoming requests
 * and their results.
 */

import jwt from "jsonwebtoken";
import models from "@vipfy-private/sequelize-setup";
import session from "express-session";
import connectRedis from "connect-redis";
import { getNewPasswordData } from "./helpers/functions";
import Utility from "./helpers/createHmac";
import logger from "./loggers";
import { redis, REDIS_SESSION_PREFIX } from "./constants";

const RedisStore = connectRedis(session);
const {
  SECRET,
  SECRET_THREE,
  ENVIRONMENT = "development",
  SESSION_LIFETIME = 1000 * 60 * 60 * 9 // One work day with breaks
} = process.env;

export const sessionMiddleware = session({
  store: new RedisStore({ client: redis, prefix: REDIS_SESSION_PREFIX }),
  name: "vipfy-session",
  resave: false, // prevents the session from being saved every time
  saveUninitialized: false, // could create Race conditions when true
  secret: SECRET,
  cookie: {
    httpOnly: true,
    maxAge: SESSION_LIFETIME,
    // Required Setting for Chrome in future Releases, see VIP-1030
    secure: ENVIRONMENT.toLowerCase() == "production",
    sameSite: "none"
  }
});

// eslint-disable-next-line
export const loggingMiddleWare = (req, res, next) => {
  const oldWrite = res.write;
  const oldEnd = res.end;

  const chunks = [];

  res.write = (...restArgs) => {
    chunks.push(new Buffer(restArgs[0]));
    oldWrite.apply(res, restArgs);
  };

  res.end = async (...restArgs) => {
    if (restArgs[0]) {
      chunks.push(new Buffer(restArgs[0]));
    }

    const body = Buffer.concat(chunks).toString("utf8");
    let user = null;
    let eventtype;
    let eventdata;

    try {
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(body);
      } catch (err) {
        parsedBody = { data: { unparsedBody: body } };
      }

      const { variables } = req.body;

      if (req.session && req.session.token && req.session.token != "null") {
        const customer = jwt.decode(req.session.token);

        user = customer.user;
      }

      if (variables && variables.password) {
        variables.password = await getNewPasswordData(variables.password);
      }

      if (variables && variables.pw) {
        variables.pw = await getNewPasswordData(variables.pw);
      }

      if (variables && variables.newPw) {
        variables.newPw = await getNewPasswordData(variables.newPw);
      }

      if (variables && variables.confirmPw) {
        variables.confirmPw = await getNewPasswordData(variables.confirmPw);
      }

      if (parsedBody.data && parsedBody.data != {}) {
        eventtype = Object.keys(parsedBody.data)[0];
        parsedBody.data.ua = req.headers["user-agent"];

        parsedBody.data.variables = variables;

        if (parsedBody.data[Object.keys(parsedBody.data)[0]]) {
          const { token: bodyToken } = parsedBody.data[
            Object.keys(parsedBody.data)[0]
          ];

          if (bodyToken && bodyToken != "null") {
            const encToken = await Utility.generateHmac(
              bodyToken,
              SECRET_THREE
            );

            parsedBody.data[Object.keys(parsedBody.data)[0]].token = encToken;
          }
        }

        eventdata = parsedBody.data;
      }

      const log = {
        ip: req.ip,
        eventtype,
        eventdata,
        user
      };

      if (parsedBody.data) {
        // logger.log("verbose", eventtype, log);
      }

      if (user) {
        models.Human.update(
          { lastactive: models.sequelize.fn("NOW") },
          { where: { unitid: user.unitid } }
        );

        if (user.impersonator) {
          models.Human.update(
            { lastactive: models.sequelize.fn("NOW") },
            { where: { unitid: user.impersonator } }
          );
        }
      }
    } catch (err) {
      logger.error(err);
    }
    oldEnd.apply(res, restArgs);
  };
  next();
};
