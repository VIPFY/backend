/*
* Several Middleware for the app. authMiddleware validates tokens received from the
* client and destroys them otherwise, fileMiddleware makes it possible to use
* files to our backend and loggingMiddleWare logs incoming requests and their results.
*/

import jwt from "jsonwebtoken";
import formidable from "formidable";
import mkdirp from "mkdirp";
import bcrypt from "bcrypt";
import { SECRET, SECRET_TWO, SECRET_THREE } from "./login-data";
import { refreshTokens } from "./helpers/auth";
import models from "./models";
import Utility from "./helpers/createHmac";
import logger from "./loggers";

/* eslint-disable consistent-return, prefer-destructuring */
export const authMiddleware = async (req, res, next) => {
  const token = req.headers["x-token"];
  if (token != "null" && token) {
    try {
      const { user } = await jwt.verify(token, SECRET);
      req.user = user;
    } catch (err) {
      console.error(err);
      if (err.name == "TokenExpiredError") {
        // If the token has expired, we use the refreshToken to assign new ones
        const refreshToken = req.headers["x-refresh-token"];
        const newTokens = await refreshTokens(refreshToken, models, SECRET, SECRET_TWO);

        if (newTokens.token && newTokens.refreshToken) {
          res.set("Access-Control-Expose-Headers", "x-token, x-refresh-token");
          res.set("x-token", newTokens.token);
          res.set("x-refresh-token", newTokens.refreshToken);
        }
        req.user = newTokens.user;
      } else {
        req.headers["x-token"] = undefined;
        req.headers["x-refresh-token"] = undefined;
      }
    }
  }
  next();
};

export const fileMiddleware = (req, res, next) => {
  const uploadDir = "src/files";

  if (!req.is("multipart/form-data")) {
    return next();
  }

  if (uploadDir) mkdirp.sync(uploadDir);
  const form = formidable.IncomingForm({ uploadDir });

  form.multiples = true;
  form.parse(req, (error, { operations }, files) => {
    if (error) {
      console.log(error);
    }

    const document = JSON.parse(operations);
    if (Object.keys(files).length) {
      if (files.file) {
        const {
          file: { type, path: thePath, size, name }
        } = files;
        document.variables.file = { type, path: thePath, size, name };
      }

      if (files.file2) {
        const {
          file2: { type, path: thePath, size, name }
        } = files;
        document.variables.file2 = { type, path: thePath, size, name };
      }

      if (files.files) {
        document.variables.files = Object.values(files.files).map(fi => {
          const { type, path: thePath, size, name } = fi;
          return { type, path: thePath, size, name };
        });
      }
    }

    req.body = document;
    next();
  });
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
      const parsedBody = JSON.parse(body);
      const { variables } = req.body;
      const token = req.headers["x-token"];

      if (token && token != "null") {
        const {
          user: { unitid }
        } = jwt.decode(token);
        user = unitid;
      }

      if (variables && variables.password) {
        variables.password = await bcrypt.hash(variables.password, 12);
      }

      if (parsedBody.errors) {
        parsedBody.errors[0].variables = variables;
        eventtype = `Error: ${parsedBody.errors[0].path[0]}`;
        eventdata = parsedBody.errors;
      } else if (parsedBody.data && parsedBody.data != {}) {
        eventtype = Object.keys(parsedBody.data)[0];
        parsedBody.data.ua = req.headers["user-agent"];

        parsedBody.data.variables = variables;

        if (parsedBody.data[Object.keys(parsedBody.data)[0]]) {
          const { token: bodyToken, refreshToken } = parsedBody.data[
            Object.keys(parsedBody.data)[0]
          ];

          if (bodyToken && bodyToken != "null") {
            const encToken = await Utility.generateHmac(bodyToken, SECRET_THREE);
            const encRefreshToken = await Utility.generateHmac(refreshToken, SECRET_THREE);

            parsedBody.data[Object.keys(parsedBody.data)[0]].token = encToken;
            parsedBody.data[Object.keys(parsedBody.data)[0]].refreshToken = encRefreshToken;
          }
        }

        eventdata = parsedBody.data;
      }

      const log = {
        time: new Date().toUTCString(),
        ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        eventtype,
        eventdata,
        user
      };

      if (parsedBody.data) {
        logger.log("info", eventtype, log);
      } else {
        logger.log("error", eventtype, log);
      }

      if (req.body.query.includes("mutation")) {
        models.Log.create(log);
      }

      if (user) {
        models.Human.update({ lastactive: new Date().toUTCString() }, { where: { unitid: user } });
      }
    } catch ({ name, stack }) {
      logger.error(`${name}: ${stack}`);
    }
    oldEnd.apply(res, restArgs);
  };
  next();
};
