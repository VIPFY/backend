/*
  Middleware to authenticate the user. Validates tokens received from the
  client and destroys them otherwise
*/
import jwt from "jsonwebtoken";
import formidable from "formidable";
import mkdirp from "mkdirp";
import { SECRET, SECRETTWO } from "./login-data";
import { refreshTokens } from "./helpers/auth";
import models from "./models";

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
        const newTokens = await refreshTokens(token, refreshToken, models, SECRET, SECRETTWO);

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

const uploadDir = "files";

export const fileMiddleware = (req, res, next) => {
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
