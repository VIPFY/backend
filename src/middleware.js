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

/* eslint-disable consistent-return */
export const authMiddleware = async (req, res, next) => {
  const token = req.headers["x-token"];
  if (token != "null" && token) {
    try {
      const { user } = await jwt.verify(token, SECRET);
      req.user = user;
    } catch (err) {
      console.log(err);
      if (err.name == "TokenExpiredError") {
        // If the token has expired, we use the refreshToken to assign new ones
        const refreshToken = req.headers["x-refresh-token"];
        const newTokens = await refreshTokens(token, refreshToken, models, SECRET, SECRET_TWO);

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
  const uploadDir = "files";

  if (!req.is("multipart/form-data")) {
    return next();
  }

  if (uploadDir) mkdirp.sync(uploadDir);

  const form = formidable.IncomingForm({ uploadDir });

  form.parse(req, (error, { operations }, files) => {
    if (error) {
      console.log(error);
    }

    const document = JSON.parse(operations);

    if (Object.keys(files).length) {
      const { file: { type, path, size, name } } = files;
      document.variables.file = { type, path, size, name };
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
    const token = req.headers["x-token"];
    let user = null;

    if (token && token != "null") {
      const { user: { unitid } } = jwt.decode(token);
      user = unitid;
    }

    if (req.body.variables.password) {
      const encryptedPw = await bcrypt.hash(req.body.variables.password, 12);
      req.body.variables.password = encryptedPw;
    }

    const parsedBody = JSON.parse(body);

    if (parsedBody.data) {
      parsedBody.data.ua = req.headers["user-agent"];

      parsedBody.data.variables = req.body.variables;
      const { token: bodyToken, refreshToken } = parsedBody.data[Object.keys(parsedBody.data)[0]];

      if (bodyToken && bodyToken != "null") {
        const encToken = await Utility.generateHmac(bodyToken, SECRET_THREE);
        const encRefreshToken = await Utility.generateHmac(refreshToken, SECRET_THREE);

        parsedBody.data[Object.keys(parsedBody.data)[0]].token = encToken;
        parsedBody.data[Object.keys(parsedBody.data)[0]].refreshToken = encRefreshToken;
      }

      delete req.body.query;
    } else if (parsedBody.errors) {
      parsedBody.errors[0].variables = req.body.variables;
    }

    models.Log.create({
      time: new Date().toUTCString(),
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      eventtype: parsedBody.data ? req.body.operationName : `Error: ${req.body.operationName}`,
      eventdata: parsedBody.data ? parsedBody.data : parsedBody.errors,
      user
    });
    oldEnd.apply(res, restArgs);
  };
  next();
};
