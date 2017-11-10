import express from "express";
import bodyParser from "body-parser";
import { graphiqlExpress, graphqlExpress } from "graphql-server-express";
import { makeExecutableSchema } from "graphql-tools";
//Install if problems occur
// import cors from "cors";
import jwt from "jsonwebtoken";

import typeDefs from "./schemas/schema";
import resolvers from "./resolvers/resolvers";
import models from "./models";
import { SECRET } from "./login-data";

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

const app = express();
const PORT = process.env.PORT || 4000;

const addUser = async req => {
  const token = req.headers.authorization;
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
  "/graphiql",
  graphiqlExpress({
    endpointURL: "/graphql"
  })
);

app.use(
  "/graphql",
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

models.sequelize.sync().then(() =>
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Go to localhost:${PORT}/graphiql for the Interface`);
  })
);
