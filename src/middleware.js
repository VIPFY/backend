/*
 * Several Middleware for the app. authMiddleware validates tokens received from the
 * client and destroys them otherwise and loggingMiddleWare logs incoming requests
 * and their results.
 */

import jwt from "jsonwebtoken";
import models from "@vipfy-private/sequelize-setup";
import { checkAuthentification, getNewPasswordData } from "./helpers/auth";
import Utility from "./helpers/createHmac";
import logger from "./loggers";

const { SECRET, SECRET_THREE } = process.env;

/* eslint-disable consistent-return, prefer-destructuring */
export const authMiddleware = async (req, res, next) => {
  const token = req.headers["x-token"];
  const impersonatorToken = req.headers["i-token"];

  if (token != "null" && token) {
    try {
      const { user } = await jwt.verify(token, SECRET);

      await checkAuthentification(user.unitid, user.company);

      // Make sure that the impersonator is in the same company
      if (impersonatorToken != "null" && impersonatorToken) {
        const { user: impersonator } = await jwt.verify(token, SECRET);

        if (user.company != impersonator.company) {
          throw new Error("You can't impersonate a user from another company!");
        }

        await checkAuthentification(impersonator.unitid, impersonator.company);
      }
    } catch (err) {
      logger.info(err);
      logger.info(err);
      req.headers["x-token"] = undefined;
      req.headers["i-token"] = undefined;
    }
  }
  next();
};

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
      const token = req.headers["x-token"];

      if (token && token != "null") {
        const customer = jwt.decode(token);

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
        logger.log("verbose", eventtype, log);
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
