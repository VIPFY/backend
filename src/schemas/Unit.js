export const types = `
  type Unit {
    id: Int!
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    riskvalue: Int
    createdate: String!
  }

  type Human {
    unitid: Unit!
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
    statisticdata: JSON
  }

  type User {
    id: Int!
    firstname: String
    middlename: String
    lastname: String
    length: Int
    title: String
    sex: SEX
    birthday: String
    resetoption: Int
    language: String
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    riskvalue: Int
    emails: [Email]
    createdate: String
    company: Department
    teams: Boolean
    domains: Boolean
    marketplace: Boolean
    billing: Boolean
    statisticdata: JSON
  }

  input UserInput {
    firstname: String
    middlename: String
    lastname: String
    password: String
    email: String
    oldemail: String
    verified: Boolean
    banned: Boolean
    title: String
    sex: SEX
    birthday: Date
    language: String
    statisticdata: JSON
  }
`;

export const queries = `
  # Returns the logged-in user. Used for Authentication
  me: User
`;

export const mutations = `
  createUser(user: UserInput!, file: File): Response!
  updateUser(user: UserInput!): Response!
  updateProfilePic(file: File!): String!

  # Only an email is required for the signup
  signUp(email: String!, newsletter: Boolean): RegisterResponse!

  # The user will be passed back a JSON Web token for authentication
  signIn(email: String!, password: String!): LoginResponse!

  # After confirming the email, an user has to set a password
  signUpConfirm(email: String!, password: String!): RegisterResponse!

  # Let an active user change his password
  changePassword(pw: String!, newPw: String!, confirmPw: String): LoginResponse!

  # Send the user a new link for sign up
  forgotPassword(email: String!): ForgotPwResponse!
`;
