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
  recoveryemail: String
  birthday: String
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

type RegisterResponse {
  ok: Boolean!
  user: User
}

type LoginResponse {
  ok: Boolean!
  token: String
  refreshToken: String
  user: User
  error: String
}
`;

export const queries = `
allUsers: [User!]!
fetchUser(id: Int!): User!
me: User
user: User
`;

export const mutations = `
updateUser(firstname: String!, newFirstname: String!): [Int!]!
deleteUser(id: Int!): String!
signUp(email: String!, password: String!): RegisterResponse!
signIn(email: String!, password: String!): LoginResponse!
signOut: User!
`;
//login will pass back a JSON Web token for authentication
