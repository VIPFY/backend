import fs from "fs";
import moment from "moment";
import path from "path";
import winston from "winston";
import { LoggingWinston } from "@google-cloud/logging-winston";

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
  transports: [new winston.transports.File(options.file)],
  exitOnError: false
});

if (process.env.ENVIRONMENT == "development") {
  logger.add(new winston.transports.Console(options.console));
} else if (process.env.ENVIRONMENT == "production") {
  logger.add(new LoggingWinston());
}

export default logger;
