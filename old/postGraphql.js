import postgraphql from "postgraphql";
import { postgresLogin } from "../login-data";

const postGraphql = postgraphql(
  `postgres://postgres:${postgresLogin}@localhost:5432/postgres`,
  "public", //Name of the Schema that should be used
  //Configuration Object
  {
    graphiql: true,
    enableCors: true,
    extendedErrors: ["hint", "detail", "errcode"]
  }
);

export default postGraphql;
