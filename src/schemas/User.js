export const types = `
# An user needs an unique email and will be given an auto-generated id
  type User {
    id: Int!
    email: String!
    createdAt: String
    updatedAt: String
    lastactive: String
    firstname: String
    middlename: String
    lastname: String
    userstatus: String
    title: String
    sex: SEX
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
    lastsecret: String
    riskvalue: Int
    newsletter: Boolean
    userstatus: USER_STATUS
  }

# An Employee is an user who belongs to at least one company
  type Employee {
    companyid: Int!
    departmentid: Int!
    begindate: String
    enddate: String
    position: String
    user: User
    userid: Int!
  }

# Every user has a set of rights which handles his access to different parts of Vipfy
  type UserRight {
    companyid: Int!
    departmentid: Int!
    userid: Int!
    userright: Int!
    user: User!
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
