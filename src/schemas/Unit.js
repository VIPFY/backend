export const types = `
# A human needs an unique email and will be given an auto-generated id
  type Unit {
    id: Int!
    payingoptions: JSON
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    riskvalue: Int
    createdate: String!
    position: String
    parentunit: Unit
  }

  type Human {
    id: Int!
    firstname: String
    middlename: String
    lastname: String
    title: String
    sex: SEX
    passwordhash: String
    birthday: String
    lastactive: String
    resetoption: Int
    language: String
  }

  type HumanUnit {
    unitid: Unit!
    humanid: Human!
  }

  type Department {
    id: Int!
    name: String!
    legalinformation: JSON
    staticdata: JSON
    unitid: Unit!
  }

  type User {
    id: Int!
    firstname: String
    middlename: String
    lastname: String
    title: String
    sex: SEX
    birthday: String
    resetoption: Int
    language: String
    payingoptions: JSON
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    riskvalue: Int
    position: String
    emails: [String!]!
    unitid: Unit
  }
`;

export const queries = `
  # Returns the logged-in user. Used for Authentication.
  me: User
  fetchUserByPassword(password: String!): String!

  # Returns all Users for messages
  allUsers: [User]!
`;

export const mutations = `
  updateProfilePic(profilepicture: String!): Response!
  deleteUser: String!

  # Only an email is required for the signup
  signUp(email: String!, newsletter: Boolean): RegisterResponse!

  # The user will be passed back a JSON Web token for authentication
  signIn(email: String!, password: String!): LoginResponse!

  # After confirming the email, an user has to set a password
  signUpConfirm(email: String!, password: String!): RegisterResponse!

  # Send the user a new link for sign up
  forgotPassword(email: String!): ForgotPwResponse!

  # Freeze the account of an user
  freezeAccount(unitid: Int!): Response!
`;
