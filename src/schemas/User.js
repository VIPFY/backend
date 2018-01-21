export const types = `
# An user needs an unique email and will be given an auto-generated id
  type User {
    id: Int!
    firstname: String
    middlename: String
    lastname: String
    position: String
    email: String!
    title: String
    sex: SEX
    userstatus: USER_STATUS
    birthday: String
    recoveryemail: String
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
    referall: Int
    cobranded: Int
    resetoption: Int
    createdAt: String
    updatedAt: String
  }

# An Employee is an user who belongs to at least one company
  type Employee {
    userid: Int!
    user: User
    companyid: Int!
    company: Company
    departmentid: Int!
    department: Department
    begindate: String
    enddate: String
    position: String
  }

# Every user has a set of rights which handles his access to different parts of Vipfy
  type UserRight {
    companyid: Company
    departmentid: Department
    userright: Int!
    userid: Int
    user: User
  }

# Languages of an user
  type Speak {
    userid: Int,
    user: User
    language: [String]
    preferred: Boolean
  }

# Bills of an user
  type UserBill {
    userid: Int
    user: User
    date: String
    billpos: Int
    textpos: String
    price: Float
    currency: String
    planid: Int
    plan: Plan
    orgcurrency: String
    exchangerate: Float
  }
`;

export const queries = `
  allUsers: [User!]!
  fetchUser(id: Int!): User
  me: User
  fetchUserByPassword(password: String!): String!

  allEmployees: [Employee]
  fetchEmployee(userId: Int!): Employee!

  # Shows all User rights
  allUserRights: [UserRight!]!

  # Shows all the rights an user has
  fetchUserRights(userid: Int!): [UserRight!]

  fetchUserBills: [UserBill]
`;

export const mutations = `
  updateUser(firstname: String!, newFirstname: String!): [Int!]!
  deleteUser(id: Int!): String!

  # Only an email is required for the signup
  signUp(email: String!, newsletter: Boolean): RegisterResponse!

  # The user will be passed back a JSON Web token for authentication
  signIn(email: String!, password: String!): LoginResponse!

  # After confirming the email, an user has to set a password
  signUpConfirm(email: String!, password: String!): RegisterResponse!

  # Send the user a new link for sign up
  forgotPassword(email: String!): ForgotPwResponse!
`;
