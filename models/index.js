import Sequelize from "sequelize";
import { postgresLogin } from "../login-data";

const sequelize = new Sequelize(
  "postgres", //Name of the database
  "postgres", //Username
  postgresLogin, //Password
  {
    dialect: "postgres", //Which database is used
    host: "localhost", //The host used
    port: "5432"
  }
);

const db = {
  user: sequelize.import("./user")
};

db.sequelize = sequelize;
// db.Sequelize = Sequelize;

export default db;
