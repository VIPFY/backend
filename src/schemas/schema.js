import * as User from "./User";
import * as App from "./App";
import * as Review from "./Review";
import * as Company from "./Company";
import * as Message from "./Message";
import * as Common from "./Common";
import * as DD24 from "./DD24";
import * as Weebly from "./Weebly";

// Create Arrays to store the data from every schema
const types = [];
const queries = [];
const mutations = [];
const subscriptions = [];

// Enter every schema into this array to map over it's data
const schemas = [User, App, Company, Review, DD24, Weebly, Message, Common];

// Push the value into the corresponding Array to export it
schemas.forEach(schema => {
  types.push(schema.types);
  queries.push(schema.queries);
  mutations.push(schema.mutations);
  subscriptions.push(schema.subscriptions);
});

export default `
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
