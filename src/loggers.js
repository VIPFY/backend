import fs from "fs";
import moment from "moment";
import path from "path";
import winston from "winston";

const now = moment();
const date = now.format("YYYY-MM-DD");
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
    masxsize: 5242880,
    maxFiles: 5,
    colorize: false,
    format: winston.format.combine(winston.format.timestamp(), winston.format.prettyPrint())
  },
  console: {
    level: "debug",
    handleExceptions: true,
    json: false,
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
}

export default logger;
