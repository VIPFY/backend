/*
This component establishes the connection to our database, loads all defined
models, adds mapping to the models so that they can be accessed in the other
components and exports everything as one big object.
*/

import Sequelize from "sequelize";
import dotenv from "dotenv";
import { POSTGRESLOGIN } from "../login-data";
import { selectEnv } from "../helpers/selectEnv";
// dotenv must be the first package loaded and launched, because it loads the
// environment variables.
dotenv.config({ path: selectEnv(process.env.ENVIRONMENT) });

const sequelize = new Sequelize(
  process.env.DB_NAME || "postgres", // Name of the database
  process.env.DB_USER || "postgres", // Username
  process.env.DB_PW || POSTGRESLOGIN, // Password
  {
    dialect: "postgres", // Which database is used
    host: process.env.DB_IP || "localhost", // The host used
    port: process.env.DB_PORT || 5432,
    define: {
      timestamps: false
    },
    logging: !!process.env.LOGGING
  }
);

// The mapping here will be used in the resolver to access the model.
// For example models.User
const db = {
  User: sequelize.import("./user"),
  App: sequelize.import("./app"),
  Company: sequelize.import("./company"),
  Department: sequelize.import("./department"),
  Employee: sequelize.import("./employee"),
  Developer: sequelize.import("./developer"),
  Review: sequelize.import("./review"),
  AppImage: sequelize.import("./appimage"),
  UserRight: sequelize.import("./userright"),
  Plan: sequelize.import("./plan"),
  Notification: sequelize.import("./notification"),
  AppNotification: sequelize.import("./appnotification"),
  ReviewHelpful: sequelize.import("./reviewhelpful"),
  Speak: sequelize.import("./speak"),
  UserBill: sequelize.import("./userbill")
};

Object.keys(db).forEach(modelName => {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;

export default db;
