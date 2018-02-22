export const types = `
# A human needs an unique email and will be given an auto-generated id
  type Unit {
    id: Int!
    payingoptions: PayingOptions
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    riskvalue: Int
    createdate: String!
    position: String
    parentunit: Unit
  }

  type PayingOptions {
    a: String
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
    legalinformation: LegalInformation
    staticdata: StaticData
    unitid: Unit!
  }

  type LegalInformation {
    a: String
  }

  type StaticData {
    a: String

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
    payingoptions: PayingOptions
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    riskvalue: Int
    position: String
    email: String!
    verified: Boolean!
    unitid: Unit!
  }
`;

export const queries = `
  # Returns the logged-in user. Used for Authentication.
  me: User
  fetchUserByPassword(password: String!): String!
`;

export const mutations = `
  updateUser(firstname: String!, newFirstname: String!): [Int!]!
  deleteUser: String!

  # Only an email is required for the signup
  signUp(email: String!, newsletter: Boolean): RegisterResponse!

  # The user will be passed back a JSON Web token for authentication
  signIn(email: String!, password: String!): LoginResponse!

  # After confirming the email, an user has to set a password
  signUpConfirm(email: String!, password: String!): RegisterResponse!

  # Send the user a new link for sign up
  forgotPassword(email: String!): ForgotPwResponse!
`;
