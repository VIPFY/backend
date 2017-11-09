import express from "express";
import bodyParser from "body-parser";
import { graphiqlExpress, graphqlExpress } from "graphql-server-express";
import { makeExecutableSchema } from "graphql-tools";
import jwt from "jsonwebtoken";
import typeDefs from "./schema";
import resolvers from "./resolvers";
import models from "./models";
import postGraphql from "./services/postGraphql";
import { SECRET } from "./login-data";
// import cors from 'cors'

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

//Use the Express Framework and define the place where the server is running
const app = express();
const PORT = process.env.PORT || 4000;

const addUser = async req => {
  const token = req.headers.authentication;
  try {
    const { user } = await jwt.verify(token, SECRET);
    req.user = user;
  } catch (err) {
    console.log(err);
  }
  req.next();
};

// app.use(cors("*"));
app.use(addUser);

app.use(
  "/auth/graphiql",
  graphiqlExpress({
    endpointURL: "/auth/graphql"
  })
);

app.use(
  "/auth/graphql",
  bodyParser.json(),
  graphqlExpress(req => ({
    schema,
    context: {
      models,
      SECRET,
      user: req.user
    }
  }))
);

//Use PostGraphql to automatically create a Schema from the database
app.use(postGraphql);

models.sequelize.sync().then(() => {
  return app.listen(PORT, () => {
    console.log(`App listening on PORT ${PORT}...`);
    console.log(`Go to localhost:${PORT}/graphiql for the GraphQL-Interface.`);
    console.log("Press Ctrl+C to quit.");
  });
});
