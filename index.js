import express from "express";
import bodyParser from "body-parser";
import { graphiqlExpress, graphqlExpress } from "graphql-server-express";
import { makeExecutableSchema } from "graphql-tools";
import cors from "cors";
import jwt from "jsonwebtoken";
//To create the GraphQl functions
import typeDefs from "./schemas/schema";
import resolvers from "./resolvers/resolvers";
import models from "./models";
import { SECRET, SECRETTWO } from "./login-data";

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware to authenticate the user. If the user sends the authorization token
// he receives after a successful login, everything will be fine.
// Otherwise an error that an JSON-Webtoken is required will be thrown.
// const authMiddleware = async req => {
//   const token = req.headers.authorization;
//   try {
//     const { user } = await jwt.verify(token, SECRET);
//     req.user = user;
//   } catch (err) {
//     console.log(err);
//   }
//   req.next();
// };
// app.use(authMiddleware);

// Enable our Frontend running on localhost:3000 to access the Backend
const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true // <-- REQUIRED backend setting
};
app.use(cors(corsOptions));

//Enable to Graphiql Interface
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
      user: req.user,
      SECRET,
      SECRETTWO
    }
  }))
);

models.sequelize.sync().then(() =>
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Go to http://localhost:${PORT}/graphiql for the Interface`);
  })
);
