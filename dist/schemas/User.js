"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var types = exports.types = "\n# An user needs an unique email and will be given an auto-generated id\n  type User {\n    id: Int!\n    email: String!\n    createdAt: String\n    updatedAt: String\n    lastactive: String\n    firstname: String\n    middlename: String\n    lastname: String\n    userstatus: String\n    title: String\n    sex: SEX\n    recoveryemail: String\n    birthday: String\n    mobilenumber: String\n    telefonnumber: String\n    addresscountry: String\n    addressstate: String\n    addresscity: String\n    addressstreet: String\n    addressnumber: String\n    profilepicture: String\n    lastsecret: String\n    riskvalue: Int\n    newsletter: Boolean\n    userstatus: USER_STATUS\n  }\n\n# An Employee is an user who belongs to at least one company\n  type Employee {\n    companyid: Int!\n    departmentid: Int!\n    begindate: String\n    enddate: String\n    position: String\n    user: User\n    userid: Int!\n  }\n\n# Every user has a set of rights which handles his access to different parts of Vipfy\n  type UserRight {\n    companyid: Int!\n    departmentid: Int!\n    userid: Int!\n    userright: Int!\n    user: User!\n  }\n";

var queries = exports.queries = "\n  allUsers: [User!]!\n  fetchUser(id: Int!): User\n  me: User\n  fetchUserByPassword(password: String!): String!\n\n  allEmployees: [Employee]\n  fetchEmployee(userId: Int!): Employee!\n\n  # Shows all User rights\n  allUserRights: [UserRight!]!\n\n  # Shows all the rights an user has\n  fetchUserRights(userid: Int!): [UserRight!]\n";

var mutations = exports.mutations = "\n  updateUser(firstname: String!, newFirstname: String!): [Int!]!\n  deleteUser(id: Int!): String!\n\n  # Only an email is required for the signup\n  signUp(email: String!, newsletter: Boolean!): RegisterResponse!\n\n  # The user will be passed back a JSON Web token for authentication\n  signIn(email: String!, password: String!): LoginResponse!\n\n  # After confirming the email, an user has to set a password\n  signUpConfirm(email: String!, password: String!): RegisterResponse!\n\n  # Send the user a new link for sign up\n  forgotPassword(email: String!): RegisterResponse!\n";