/*
This component establishes the connection to our database, loads all defined
models, adds mapping to the models so that they can be accessed in the other
components and exports everything as one big object.
*/

import Sequelize from "sequelize";
import { POSTGRESLOGIN } from "../login-data";

const sequelize = new Sequelize(
  process.env.TEST_DB || "postgres", //Name of the database
  process.env.USER, //Username
  process.env.PW || POSTGRESLOGIN, //Password
  {
    dialect: "postgres", //Which database is used
    host: process.env.IP_DB || "localhost", //The host used
    port: process.env.PORT_DB || 5432,
    define: {
      timestamps: false
    },
    logging: process.env.LOGGING ? true : false
  }
);

//The mapping here will be used in the resolver to access the model.
//For example models.User
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
