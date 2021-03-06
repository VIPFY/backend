const userFields = `
  id: ID!
  profilepicture: String
  isadmin: Boolean!
  companyban: Boolean
  isonline: Boolean
  permissions: Permissions
`;

const basicFields = `
  firstname: String
  middlename: String
  lastname: String
  title: String
  suffix: String
  sex: SEX
  birthday: Date
  language: String
`;

export const types = `
  type Permissions {
    customServiceIntegration: Boolean
    manageOwnAccounts: Boolean
    ownAssignments: Int
    sso: Boolean
  }

  type Unit {
    id: ID!
    profilepicture: String
    createdate: String!
  }

  type User {
    createdate: String!
    ${userFields}
    ${basicFields}
    hiredate: Date
    position: String
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    emails: [Email]
    addresses: [Address]
    phones: [Phone]
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
    vacations: [Vacation]
    supporttoken: String
    assignments: [LicenceAssignment]
    pseudonymousid: ID
    pseudonymousdeviceid: ID
    recoverypublickey: String
    recoveryprivatekey: String
  }

  type PublicUser {
    ${userFields}
    ${basicFields}
  }

  type Vacation {
    id: ID!
    unitid: User
    starttime: Date
    endtime: Date
    createdat: Date
    options: JSON
  }

  type SemiPublicUser {
    ${userFields}
    ${basicFields}
    hiredate: Date
    position: String
    deleted: Boolean!
    banned: Boolean!
    emails: [Email]
    addresses: [Address]
    phones: [Phone]
    company: Department
    passwordlength: Int
    passwordstrength: Int
    twofa: [String]
    needstwofa: Boolean
    lastactive: Date
    vacations: [Vacation]
    usesencryption: Boolean
    assignments: [LicenceAssignment]
    recoverypublickey: String
    needspasswordchange: Boolean
  }

  type VacationUser {
    id: ID!
    firstname: String
    middlename: String
    lastname: String
    profilepicture: String
    isadmin: Boolean!
    vacationdays: Float
    vacationrequests: [VacationRequestResponse]!
    vacationdaysperyear: JSON
  }

  type SignUpFinishResponse {
    user: User!
    company: Department
    ok: Boolean
  }

  input UserInput {
    ${basicFields}
    password: String
    email: String
    oldemail: String
    position: String
    statisticdata: JSON
  }

  input SetupInput {
    name: String
    firstname: String
    lastname: String
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

  input encryptedKeyInput {
    key: ID!
    data: String!
    belongsto: ID!
  }

  input licenceKeyUpdateInput {
    licence: ID!
    old: encryptedKeyInput!
    new: encryptedKeyInput!
  }
`;

export const queries = `
  # Returns the logged-in user. Used for Authentication
  me: User

  #UserView for Company Admins
  fetchSemiPublicUser(userid: ID!): SemiPublicUser
`;

export const mutations = `
  addFavorite(licenceid: ID!): LicenceAssignment!
  removeFavorite(licenceid: ID!): LicenceAssignment!

  updateEmployee(user: EmployeeInput!): SemiPublicUser!
  updateEmployeePic(file: Upload!, userid: ID!): SemiPublicUser!

  #Setup Finished
  setupFinished(username: String, phoneNumber: String): SignUpFinishResponse!

  # Agree to Vipfy Terms of Service and Privacy Agreement
  agreeTos: Response!
  requestVacation(startDate: Date!, endDate: Date!, days: Float!): VacationRequestResponse!
  deleteVacationRequest(id: ID!): Boolean!
  requestHalfVacationDay(day: Date!): VacationRequestResponse!
  # take a token from a setup file and return a one-day JWT
  redeemSetupToken(setuptoken: String!): LoginResponse!

  resendToken(token: String!): Boolean!
  setConsent(consent: Boolean!): User!
  setVacationDays(year: Int!, days: Float!, userid: ID!): Boolean!
  updateEmployeePassword(unitid: ID!, password: String!, logOut: Boolean): UserSecurityOverview!
  updateEmployeePasswordEncrypted(unitid: ID!, recoveryPrivateKey: String, newPasskey: String!, passwordMetrics: PasswordMetricsInput!, logOut: Boolean, newKey: KeyInput!, deprecateAllExistingKeys: Boolean!, licenceUpdates: [licenceKeyUpdateInput!]!): UserSecurityOverview!
  updateMyConfig(config: JSON!): User!
`;
