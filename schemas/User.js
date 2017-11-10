// enum USER_STATUS {
//   toverify,
//   normal,
//   banned,
//   onlynews
// }

// userstatus(status: USER_STATUS)

export const types = `
type User {
  id: Int!
  email: String!
  createdAt: String!
  updatedAt: String!
  firstname: String
  middlename: String
  lastname: String
  title: String
  sex: String
  birthday: String,
  recoveryemail: String
  mobilenumber: String
  telefonnumber: String
  addresscountry: String
  addressstate: String
  addresscity: String
  addressstreet: String
  addressnumber: String
  profilepicture: String
  lastactive: String,
  lastsecret: String
  riskvalue: Int
  newsletter: Boolean
}
`;

export const queries = `
allUsers: [User!]!
me: User
`;

export const mutations = `
updateUser(firstname: String!, newFirstname: String!): [Int!]!
deleteUser(email: String!): Int!
register(username: String!, email: String!, password: String!): User!
login(email: String!, password: String!): String!
`;
