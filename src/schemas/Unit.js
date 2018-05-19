export const types = `
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
  }

  type ParentUnit {
    parentunit: Unit!
    childunit: Unit!
  }

  type Right {
    holder: User!
    forunit: User
    type: String!
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
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    riskvalue: Int
    position: String
    emails: JSON
    createdate: String
    payingoptions: JSON
    company: Department
    admin: Boolean!
  }

  type Department {
    name: String!
    legalinformation: JSON
    statisticdata: JSON
    unitid: Unit!
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    employees: Int
    payingoptions: JSON
  }

  type DepartmentData {
    name: String!
    legalinformation: JSON
    statisticdata: JSON
    unitid: Unit!
  }

  type DepartmentEmployee {
    id: Unit!
    childid: Unit
    employee: User!
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
    lastname: String
    title: String
    sex: SEX
    birthday: Date
    position: String
    language: String
  }

  input StatisticData {
    name: String
    companysize: String
    industry: String
    revenue: String
    companyage: String
    ageofowner: String
  }
`;

export const queries = `
  # Returns the logged-in user. Used for Authentication
  me: User

  # Checks whether the user is an admin
  admin: User

  # Returns an user. Should only be usable by an admin
  fetchUser(id: Int!): User!
  fetchUserByPassword(password: String!): String!

  # Returns all Users for messages
  allUsers: [User]!

  allDepartments: [Department]!

  # Returns the amount of units in a Department
  fetchCompanySize: Int!
`;

export const mutations = `
  createUser(user: UserInput!, file: File): Response!
  updateUser(user: UserInput!): Response!
  adminUpdateUser(user: UserInput, file: File, unitid: Int!): Response!
  updateProfilePic(file: File!): Response!
  deleteUser(unitid: Int!): Response!

  createCompany(name: String!): RegisterResponse!
  updateStatisticData(data: StatisticData!): Response!
  addEmployee(id: Int!): Response!

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

  # Freeze the account of an user
  freezeAccount(unitid: Int!): Response!
`;
