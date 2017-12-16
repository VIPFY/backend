import Sequelize from "sequelize";
import { POSTGRESLOGIN } from "../login-data";

const sequelize = new Sequelize(
  "postgres", //Name of the database
  "postgres", //Username
  POSTGRESLOGIN, //Password
  {
    dialect: "postgres", //Which database is used
    host: "localhost", //The host used
    port: "5432",
    define: {
      timestamps: false
    }
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
  Plan: sequelize.import("./plan")
};

Object.keys(db).forEach(modelName => {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
// db.Sequelize = Sequelize;

export default db;
