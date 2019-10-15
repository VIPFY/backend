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
    hiredate: Date
    position: String
    title: String
    sex: SEX
    birthday: String
    resetoption: Int
    language: String
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    isadmin: Boolean!
    companyban: Boolean
    isonline: Boolean
    emails: [Email]
    addresses: [Address]
    phones: [Phone]
    createdate: String
    company: Department
    passwordlength: Int
    passwordstrength: Int
    twofa: [String]
    needstwofa: Boolean
    lastactive: Date
    statisticdata: JSON
    needspasswordchange: Boolean!
    firstlogin: Boolean!
    country: String
    config: JSON
    tutorialprogress: JSON
    consent: Boolean
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
    isonline: Boolean
  }

  type SemiPublicUser {
    id: ID!
    firstname: String
    middlename: String
    lastname: String
    hiredate: Date
    position: String
    title: String
    sex: SEX
    birthday: Date
    language: String
    deleted: Boolean!
    banned: Boolean!
    profilepicture: String
    isadmin: Boolean!
    companyban: Boolean
    isonline: Boolean
    emails: [Email]
    addresses: [Address]
    phones: [Phone]
    company: Department
    passwordlength: Int
    passwordstrength: Int
    twofa: [String]
    needstwofa: Boolean
    lastactive: Date
  }

  input UserInput {
    firstname: String
    middlename: String
    lastname: String
    password: String
    email: String
    oldemail: String
    title: String
    position: String
    sex: SEX
    birthday: Date
    language: String
    statisticdata: JSON
  }

  input SetupInput {
    name: String
    company: String
    position: String
    sector: String
    country: String
  }

  input EmployeeInput {
    id: ID!
    firstname: String
    middlename: String
    lastname: String
    hiredate: Date
    position: String
    birthday: Date
    email: EmailInput
    email2: EmailInput
    address: AddressInput
    phone: PhoneInput
    phone2: PhoneInput
    workPhone: PhoneInput
    workPhone2: PhoneInput
  }
`;

export const queries = `
  # Returns the logged-in user. Used for Authentication
  me: User

  #UserView for Company Admins
  fetchSemiPublicUser(userid: ID!): SemiPublicUser
`;

export const mutations = `
  updateEmployee(user: EmployeeInput!): SemiPublicUser!
  updateUser(user: UserInput!): Response!
  updateProfilePic(file: Upload!): User!
  updateEmployeePic(file: Upload!, unitid: ID!): SemiPublicUser!

  #Setup Finished
  initialSetup(token: String!, data: SetupInput!): Boolean!
  setupFinished(country: String, vatoption: Int, vatnumber: String, placeId: String, ownAdress: String, username: String): Response!

  # Agree to Vipfy Terms of Service and Privacy Agreement
  agreeTos: Response!

  # take a token from a setup file and return a one-day JWT
  redeemSetupToken(setuptoken: String!): LoginResponse!

  resendToken(email: String!): Boolean!
  setConsent(consent: Boolean!): User!
  updateEmployeePassword(unitid: ID!, password: String!, logOut: Boolean): UserSecurityOverview!
`;
