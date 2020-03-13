// eslint-disable-next-line
export const types = `
# The basic Response
  type Response {
    ok: Boolean!
  }

  type TokenResponse {
    ok: Boolean!
    used: Boolean
    expired: Boolean
  }

# Changing a user to an admin  
  type StatusResponse {
    id: ID!
    status: Boolean!
  }

# Contains the changed rating
  type ReviewResponse {
    ok: Boolean!
    balance: Int
    id: ID
  }

# Contains the amount of the respective Unit
  type ListCountResponse {
    allUsers: Int!
    allApps: Int!
    allCompanies: Int!
  }

  type VacationRequestResponse {
    id: ID!
    startdate: Date!
    enddate: Date!
    requested: Date!
    decided: Date
    days: Float!
    status: VACATION_STATUS!
  }

# If the registration was successful, a boolean will be given back
  type RegisterResponse {
    ok: Boolean!
    token: String
    downloads: DownloadLink
  }

  type DownloadLink {
    win64: String
    macOS: String
  }

# The user receives tokens upon a successful login
  type LoginResponse {
    ok: Boolean!
    token: String
    twofactor: String
    unitid: ID
    config: JSON
  }

# The user gets the email where the new auth is send back
  type ForgotPwResponse {
    ok: Boolean!
    email: String
  }

  type TabResponse {
    icon: String!
    appname: String!
    alias: String
    licenceid: ID!
  }

# Response from with a link to login to an app
  type ProductResponse {
    ok: Boolean!
    loginLink: String
  }

  type DepartmentDataResponse {
    id: ID
    children: [ID]
    children_data: JSON
    department: Department
    employees: [PublicUser]
    level: Int
    parent: ID
  }

  type emp {
    employeeid: ID
    firstname: String
    lastname: String
    profilepicture: String
  }

  type DistributeResponse {
    ok: Boolean
    error: Error
  }

  type JsonResponse {
    data: JSON!
  }

  type Error {
    code: Int!
    message: String!
  }

  type AppBoughtPlanResponse {
    id: ID!
    usedby: Unit
    boughtplan: BoughtPlan!
    description: String
    appname: String!
    appicon: String
    applogo: String
    appid: ID!
    licencesused: Int!
    licencestotal: Int!
    endtime: String
  }

  # The Api-Resonse from DD24
  type DD24Response {
    code: Int!
    description: String!
    availability: Int
    alternative: [String]
    extension: String
    realtime: Int
    cid: String
    status: String
    renewalmode: String
    transferlock: Int
    whoisprivacy: Int
    trustee: Int
    reserveduntil: String
    nameserver: [String]
    ttl: Int
    vatvalid: Int
    event: [Int]
    parameter: eventResponse
    class: String
    subclass: String
    object: String
    objecttype: String
    onetimepassword: String
    loginuri: String
    error: String
  }

  type TwoFactorDetails {
    twofaid: ID!
    twofatype: String!
    twofacreated: String!
    twofalastused: String!
    twofacount: String!
  }

  type UserSecurityOverview {
    id: ID!
    unitid: PublicUser!
    lastactive: String
    needspasswordchange: Boolean!
    passwordlength: Int
    passwordstrength: Int
    banned: Boolean!
    needstwofa: Boolean
    suspended: Boolean!
    createdate: String!
    twofactormethods: [TwoFactorDetails]
  }
`;
