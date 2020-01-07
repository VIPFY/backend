import fs from "fs";
import moment from "moment";
import path from "path";
import winston from "winston";

const date = moment().format("YYYY-MM-DD");
const logDir = path.join(__dirname, "./logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const options = {
  file: {
    level: process.env.LOG_LEVEL_FILE || "info",
    filename: `${logDir}/${date}.txt`,
    handleExceptions: true,
    json: true,
    colorize: false,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  },
  console: {
    level: process.env.LOG_LEVEL_CONSOLE || "debug",
    handleExceptions: true,
    json: true,
    colorize: true,
    format: winston.format.simple()
  }
};

const logger = winston.createLogger({
  transports: [],
  exitOnError: false
});

if (!process.env.NO_LOG_FILE) {
  logger.add(new winston.transports.File(options.file));
}

if (process.env.WINSTON == "generic") {
  logger.add(new winston.transports.Console(options.console));
}

export default logger;
