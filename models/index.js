import Sequelize from "sequelize";
import { POSTGRESLOGIN } from "../login-data";

const sequelize = new Sequelize(
  "postgres", //Name of the database
  "postgres", //Username
  POSTGRESLOGIN, //Password
  {
    dialect: "postgres", //Which database is used
    host: "localhost", //The host used
    port: "5432"
  }
);

const db = {
  User: sequelize.import("./user"),
  App: sequelize.import("./app"),
  Developer: sequelize.import("./developer")
};

Object.keys(db).forEach(modelName => {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
// db.Sequelize = Sequelize;

export default db;
