const appFields = `
  id: ID!
  disabled: Boolean!
  name: String!
  icon: String
  loginurl: String
  description: String
  teaserdescription: String
  needssubdomain: Boolean
  website: String
  logo: String
  images: [String]
  features: JSON
  options: JSON
  developer: Unit!
  supportunit: Unit!
  color: String!
  deprecated: Boolean!
  hidden: Boolean!
  owner: Department
`;

const basicLicenceFields = `
  id: ID!
  starttime: Date!
  endtime: Date
`;

const licenceFields = `
  options: JSON
  boughtplanid: BoughtPlan!
  pending: Boolean
  dashboard: Int
  tags: [String]
`;

export const types = `
  type App {
    ${appFields}
    hasboughtplan: Boolean
  }

  type CompanyServiceNEW{
    id: ID!
    app: AppDetails!
    licences: [LicenceAssignment]
    teams: [TeamBoughtPlan]
  }

  type CompanyService{
    app: AppDetails!
    orbitids: [Orbit]
  }

  type Orbit {
    id: ID!
    buytime: String
    alias: String
    endtime: String
    description: String
    key: JSON
    buyer: Unit!
    payer: Unit!
    usedby: Unit!
    planid: Plan!
    totalprice: Float
    accounts: [Account]
    teams: [Team]
  }

  type AppDetails {
    ${appFields}
    avgstars: Float
    cheapestprice: Float
    developername: String!
    cheapestpromo: Float
    supportwebsite: String
    supportphone: String
    developerwebsite: String
  }

  type TeamBoughtPlan {
    departmentid: Team
    boughtplanid: BoughtPlan
  }

  input AppInput {
    loginurl: String
    description: String
    teaserdescription: String
    needssubdomain: Boolean
    website: String    
    name: String
    disabled: Boolean
    icon: Upload
    logo: Upload
    images: [Upload!]
    developername: String
    commission: String
    color: String
    avgstars: Float
    supportphone: String
    supportwebsite: String
    developerwebsite: String
    external: Boolean
    developer: ID
    supportunit: ID
    hidden: Boolean
    image: Upload
  }

  input SSOInput {
    images: [Upload!]
    name: String!
    loginurl: String!
    email: String!
    password: String!
    color: String!
    manager: Boolean
  }

  input AppOptions {
    type: String!
    emailobject: String!
    buttonobject: String
    passwordobject: String!
    button1object: String
    button2object: String
    errorobject: String
    hideobject: String
    waituntil: String
    predomain: String
    afterdomain: String
  }

  type ServiceLicence{
    ${basicLicenceFields}
    agreed: Boolean
    alias: String
    licence: Licence!
  }

  type Licence {
    ${basicLicenceFields}
    ${licenceFields}
    agreed: Boolean
    disabled: Boolean
    key: JSON
    unitid: SemiPublicUser
    view: Boolean!
    edit: Boolean!
    delete: Boolean!
    use: Boolean!
    vacationstart: Date
    vacationend: Date
    teamlicence: Team
    teamaccount: Team
    alias: String
    rightscount: Int
    assignmentid: LicenceAssignment
    vacationid: Vacation
  }

  type Account {
    id: ID!
    boughtplanid: BoughtPlan
    options: JSON
    starttime: Date
    endtime: Date
    agreed: Boolean
    disabled: Boolean
    key: JSON
    pending: Boolean
    alias: String
    assignments: [LicenceAssignment]
  }

  type LicenceAssignment {
    ${basicLicenceFields}
    ${licenceFields}
    sidebar: Int
    agreed: Boolean
    disabled: Boolean
    key: JSON
    unitid: SemiPublicUser
    view: Boolean!
    edit: Boolean!
    delete: Boolean!
    use: Boolean!
    vacationstart: Date
    vacationend: Date
    teamlicence: Team
    teamaccount: Team
    alias: String
    rightscount: Int
    accountid: ID
    assignmentid: ID
    assignoptions: JSON
    vacationid: Vacation
  }

  type PublicLicence {
    ${basicLicenceFields}
    ${licenceFields}
    sidebar: Int
    unitid: PublicUser
  }

  type TempLicence {
    id: ID!
    starttime: Date!
    endtime: Date!
    view: Boolean!
    edit: Boolean!
    delete: Boolean!
    use: Boolean!
    licenceid: PublicLicence!
    unitid: SemiPublicUser!
    owner: SemiPublicUser!
    tags: [String]!
  }
  
  input LicenceRightInput {
    id: ID!
    impersonator: ID!
    view: Boolean
    edit: Boolean
    delete: Boolean
    use: Boolean
    tags: [String]
    starttime: Date
    endtime: Date
  }

  input LicenceRights {
    view: Boolean
    edit: Boolean
    delete: Boolean
    use: Boolean
  }

  input LicenceRightUpdateInput {
    licenceid: ID!
    starttime: Date
    endtime: Date
    user: ID
  }

  input LayoutInput {
    id: ID!
    dashboard: Int
  }

  type SimpleStats {
    id: ID!
    usedby: Unit
    boughtplan: BoughtPlan!
    minutestotal: Float!
    minutesavg: Float!
    mintesmedian: Float!
    minutesmin: Float!
    minutesmax: Float!
  }

  type AppUsage {
    app: App!
    options: JSON
    totalminutes: Int
  }

  type BoughtplanUsagePerUser {
    boughtplan: BoughtPlan!
    unit: PublicUser!
    totalminutes: Int
    licenceenddates: [String]
  }

  input SSOResult {
    loginurl: String!
    name: String!
    email: String!
    password: String!
    recaptcha: Boolean!
    tries: Int!
    unloaded: Boolean!
    passwordEntered: Boolean!
    emailEntered: Boolean!
    manager: Boolean
    userids: [ID]
    alias: String
    orbit: String
    user: ID
  }

  type IDID {
    appid: ID!
    planid: ID!
  }

`;

export const queries = `
  # Returns all apps in Vipfy
  allApps(limit: Int, offset: Int, sortOptions: SortOptions): [AppDetails]!

  # Returns a specific app by id
  fetchAppById(id: ID!): AppDetails

  # Returns all Apps a department is allowed to distribute Licences for
  fetchUnitApps(departmentid: ID!): [AppBoughtPlanResponse]!

  # Returns all Licences of the current user, optionally limited to a single licence id
  fetchLicences(licenceid: ID): [Licence]!
  fetchPureLicenceData(licenceid: ID): [Licence]!
  
  fetchLicenceAssignment(assignmentid: ID!): LicenceAssignment!

  # Returns all Licences of a current user that are not department licences
  fetchUsersOwnLicences(unitid: ID!): [Licence]

  # Returns all Licences of a defined user
  fetchUserLicences(unitid: ID!): [Licence]

  # Returns all LicenceAssignments of a defined user
  fetchUserLicenceAssignments(unitid: ID): [LicenceAssignment]

  fetchUnitAppsSimpleStats(departmentid: ID!): [SimpleStats]
  fetchSupportRequests: JSON
  fetchTotalAppUsage(starttime: Date, endtime: Date): [AppUsage]!

  # Total time spend in a specific boughtplan at some time, broken down by user
  fetchBoughtplanUsagePerUser(starttime: Date!, endtime: Date!, boughtplanid: ID!): [BoughtplanUsagePerUser]!

  fetchTotalUsageMinutes(starttime: Date, endtime: Date, assignmentid: ID, licenceid: ID, boughtplanid: ID, unitid: ID): Int

  fetchServiceLicences(employees: [ID!], serviceid: ID!): [ServiceLicence]
  fetchCompanyServices: [CompanyService]
  fetchCompanyService(serviceid: ID!): CompanyService

  fetchUseableApps: [AppDetails]

`;

export const mutations = `
  sendSupportRequest(topic: String!, description: String!, component: String!, internal: Boolean!): Boolean!

  createOwnApp(ssoData: SSOInput!): IDID

  # Deletes a licence on a set date, if it is after the normal cancel period
  deleteLicenceAt(licenceid: ID!, time: Date!): Date!

  # Agree to all terms and conditions of a licence
  agreeToLicence(licenceid: ID!): Response!

  trackMinutesSpent(assignmentid: ID!, minutes: Int!): Response!

  # Adds the data of an external App
  addExternalBoughtPlan(appid: ID!, alias: String, price: Float, loginurl: String): BoughtPlan!
  addEncryptedExternalLicence(key: JSON!, appid: ID!, boughtplanid: ID!, price: Float, touser: ID): Licence!

  failedIntegration(data: SSOResult!): Boolean!

  # Register a vote for the next app to implement
  voteForApp(app: String!): Response!

  createService(serviceData: JSON!, addedTeams: [JSON]!, addedEmployees: [JSON]!):Boolean!
  deleteService(serviceid: ID!): Boolean!

  updateLicenceSpeed(licenceid: ID!, speed: Int!, working: Boolean!, oldspeed: Int): Boolean!


  createAccount(orbitid: ID!, alias: String, logindata: JSON!, starttime: Date, endtime: Date): Account!
  changeAccount(accountid: ID!, alias: String, logindata: JSON, starttime: Date, endtime: Date): Account

  assignAccount(licenceid: ID!, userid: ID!, rights: LicenceRights, tags: [String], starttime: Date, endtime: Date, keyfragment: JSON): Boolean!
  terminateAssignAccount(assignmentid: ID!, endtime: Date, isNull: Boolean): LicenceAssignment

  createOrbit(planid: ID!, alias: String, options: JSON, starttime: Date, endtime: Date): BoughtPlan
  changeOrbit(orbitid: ID!, alias: String, loginurl: String, starttime: Date, endtime: Date): Orbit!

  createVacation(userid: ID!, starttime: Date, endtime: Date, assignments: [JSON]): Vacation
  editVacation(vacationid: ID!, starttime: Date, endtime: Date, assignments: [JSON]): Vacation
  `;
