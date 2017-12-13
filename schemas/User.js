export const types = `
# An user needs an unique email and will be given an auto-generated id
type User {
  id: Int!
  email: String!
  createdAt: String!
  updatedAt: String!
  firstname: String
  middlename: String
  lastname: String
  userstatus: String
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
  lastactive: String
  lastsecret: String
  riskvalue: Int
  newsletter: Boolean
  userstatus: USER_STATUS
}

# An user must have one of these stati
enum USER_STATUS {
  toverify,
  normal,
  banned,
  onlynews
}

# If the registration was successful, a boolean will be given back
type RegisterResponse {
  ok: Boolean!
  error: String
  email: String
}

# The user receives tokens upon a successful login
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
fetchUserByPassword(password: String!): String!
`;

export const mutations = `
updateUser(firstname: String!, newFirstname: String!): [Int!]!
deleteUser(id: Int!): String!
# Only an email is required for the signup
signUp(email: String!, newsletter: Boolean!): RegisterResponse!
# The user will be passed back a JSON Web token for authentication
signIn(email: String!, password: String!): LoginResponse!
# After confirming the email, an user has to set a password
signUpConfirm(email: String!, password: String!): RegisterResponse!
# Send the user a new link for sign up
forgotPassword(email: String!): RegisterResponse!
`;
