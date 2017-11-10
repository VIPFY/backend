import * as User from "./User";
import * as App from "./App";
import * as Developer from "./Developer";

//Create Arrays to store the data from every schema
const types = [];
const queries = [];
const mutations = [];

//Enter every schema into this array to map over it's data
const schemas = [User, App, Developer];

//Push the value into the corresponding Array to export it
schemas.forEach(schema => {
  types.push(schema.types);
  queries.push(schema.queries);
  mutations.push(schema.mutations);
});

export default `
  ${types.join("\n")}

  type Query {
    ${queries.join("\n")}
  }
  type Mutation {
    ${mutations.join("\n")}
  }
`;
