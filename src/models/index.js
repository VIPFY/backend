/*
This component establishes the connection to our database, loads all defined
models, adds mapping to the models so that they can be accessed in the other
components and exports everything as one big object.
*/

import Sequelize from "sequelize";
import dotenv from "dotenv";
import { POSTGRESLOGIN } from "../login-data";
// dotenv must be the first package loaded and launched, because it loads the
// environment variables.
const selectEnv = environment => {
  switch (environment) {
    case "production":
      return ".env.prod";

    case "testing":
      return ".env.test";

    default:
      return ".env.dev";
  }
};

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
      timestamps: false,
      freezeTableName: true
    },
    pool: {
      min: 1,
      max: 10
    },
    logging: process.env.LOGGING ? data => console.log(data) : false
  }
);

const changeCredentials = (username, password) => {
  sequelize.connectionManager.config.username = username;
  sequelize.connectionManager.config.password = password;
  const { pool } = sequelize;
  sequelize.initPools();
  pool.drain().then(() => {
    this.pool.clear();
  });
};

// The mapping here will be used in the resolver to access the model.
// For example models.User
const db = {
  Address: sequelize.import("./address"),
  App: sequelize.import("./app"),
  AppDetails: sequelize.import("./appDetails"),
  Bill: sequelize.import("./bill"),
  BillPosition: sequelize.import("./billPosition"),
  BoughtPlan: sequelize.import("./boughtPlan"),
  Department: sequelize.import("./department"),
  DepartmentApp: sequelize.import("./departmentApp"),
  DepartmentData: sequelize.import("./departmentData"),
  DepartmentEmail: sequelize.import("./departmentEmail"),
  DepartmentEmployee: sequelize.import("./departmentEmployee"),
  Email: sequelize.import("./email"),
  Human: sequelize.import("./human"),
  Licence: sequelize.import("./licence"),
  Log: sequelize.import("./log"),
  Login: sequelize.import("./login"),
  Message: sequelize.import("./message"),
  MessageData: sequelize.import("./messageData"),
  MessageGroup: sequelize.import("./messageGroup"),
  MessageGroupMembership: sequelize.import("./messageGroupMembership"),
  MessageGroupRight: sequelize.import("./messageGroupRight"),
  MessageTag: sequelize.import("./messageTag"),
  Newsletter: sequelize.import("./newsletter"),
  ParentUnit: sequelize.import("./parentUnit"),
  Phone: sequelize.import("./phone"),
  Plan: sequelize.import("./plan"),
  PlansRunning: sequelize.import("./plansRunning"),
  Promo: sequelize.import("./promo"),
  PromosRunning: sequelize.import("./promosRunning"),
  Review: sequelize.import("./review"),
  ReviewData: sequelize.import("./reviewData"),
  ReviewHelpful: sequelize.import("./reviewHelpful"),
  Right: sequelize.import("./right"),
  Unit: sequelize.import("./unit"),
  User: sequelize.import("./user"),
  Website: sequelize.import("./website")
};

Object.keys(db).forEach(modelName => {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Op = sequelize.Op;
db.changeCredentials = changeCredentials;

export default db;
