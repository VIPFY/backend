export const types = `
  type Unit {
    id: ID!
    profilepicture: String
    createdate: String!
  }

  type User {
    id: ID!
    firstname: String
    middlename: String
    lastname: String
    title: String
    sex: SEX
    birthday: String
    resetoption: Int
    language: String
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    emails: [Email]
    createdate: String
    company: Department
    statisticdata: JSON
    needspasswordchange: Boolean!
    firstlogin: Boolean!
    isadmin: Boolean!
    companyban: Boolean
    country: String
    config: JSON
  }

  input NameInput {
    firstname: String
    middlename: String
    lastname: String
  }

  input UserInput {
    firstname: String
    middlename: String
    lastname: String
    password: String
    email: String
    oldemail: String
    title: String
    sex: SEX
    birthday: Date
    language: String
    statisticdata: JSON
  }

  type PublicUser {
    id: ID!
    firstname: String
    middlename: String
    lastname: String
    title: String
    sex: SEX
    birthday: Date
    language: String
    profilepicture: String
    isadmin: Boolean!
    companyban: Boolean
  }
`;

export const queries = `
  # Returns the logged-in user. Used for Authentication
  me: User

  #The token the user receives after registration to set his password
  checkAuthToken(token: String!, email: String!): TokenResponse!
`;

export const mutations = `
  createUser(user: UserInput!, file: Upload): Response!
  updateUser(user: UserInput!): Response!
  updateProfilePic(file: Upload!): String!
  saveAppLayout(horizontal: [String], vertical: [String]): Boolean!

  # Only an email is required for the signup
  signUp(email: String!, companyname: String!, privacy: Boolean!, termsOfService: Boolean!): RegisterResponse!

  #Setup Finished
  setupFinished(country: String, vatoption: Int, vatnumber: String, placeId: String, ownAdress: String, username: String): Response!

  # The user will be passed back a JSON Web token for authentication
  signIn(email: String!, password: String!): LoginResponse!

  # After confirming the email, an user has to set a password
  signUpConfirm(email: String!, password: String!, passwordConfirm: String!, token: String!): String!

  # Let an active user change his password
  changePassword(pw: String!, newPw: String!, confirmPw: String): LoginResponse!

  # Agree to Vipfy Terms of Service and Privacy Agreement
  agreeTos: Response!

  # Send the user a new link for sign up
  forgotPassword(email: String!): ForgotPwResponse!

  # take a token from a setup file and return a one-day JWT
  redeemSetupToken(setuptoken: String!): LoginResponse!

  resendToken(email: String!): Boolean!
`;
