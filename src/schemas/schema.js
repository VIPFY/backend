import { gql } from "apollo-server-express";
import * as App from "./App";
import * as Admin from "./Admin";
import * as Auth from "./Auth";
import * as Bill from "./Bill";
import * as Common from "./Common";
import * as Contact from "./Contact";
import * as Domain from "./Domain";
import * as Department from "./Department";
import * as Message from "./Message";
import * as Unit from "./Unit";
import * as Review from "./Review";
import * as Responses from "./Responses";
import * as Demo from "./Demo";
import * as Tutorial from "./Tutorial";
import * as Team from "./Team";
import * as TwoFA from "./2FA";
import * as Log from "./Log";
import * as Internal from "./Internal";

// Create Arrays to store the data from every schema
const types = [];
const queries = [];
const mutations = [];
const subscriptions = [];

// Enter every schema into this array to map over it's data
const schemas = [
  App,
  Admin,
  Auth,
  Bill,
  Common,
  Contact,
  Domain,
  Demo,
  Department,
  Log,
  Message,
  Review,
  Responses,
  Unit,
  Tutorial,
  Team,
  TwoFA,
  Internal,
];

// Push the value into the corresponding Array to export it
schemas.forEach(schema => {
  types.push(schema.types);
  queries.push(schema.queries);
  mutations.push(schema.mutations);
  subscriptions.push(schema.subscriptions);
});

export default gql`
  scalar Upload
  
  ${types.join("\n")}

  type Query {
    ${queries.join("\n")}
  }

  type Mutation {
    ${mutations.join("\n")}
  }

  type Subscription {
    ${subscriptions.join("\n")}
  }
`;
