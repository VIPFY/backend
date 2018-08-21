import fs from "fs";
import moment from "moment";
import path from "path";
import winston from "winston";
import { LoggingWinston } from "@google-cloud/logging-winston";
import { GCLOUD_PLATFORM_ID } from "./login-data";

const date = moment().format("YYYY-MM-DD");
const logDir = path.join(__dirname, "./logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const options = {
  file: {
    level: "info",
    filename: `${logDir}/${date}.txt`,
    handleExceptions: true,
    json: true,
    colorize: false,
    format: winston.format.combine(winston.format.timestamp(), winston.format.json())
  },
  console: {
    level: "debug",
    handleExceptions: true,
    json: true,
    colorize: true,
    format: winston.format.simple()
  }
};

const logger = winston.createLogger({
  transports: [
    new winston.transports.File(options.file),
    new LoggingWinston({ ...options.file, projectId: GCLOUD_PLATFORM_ID })
  ],
  exitOnError: false
});

if (process.env.ENVIRONMENT == "development") {
  logger.add(new winston.transports.Console(options.console));
}

export default logger;
