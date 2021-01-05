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
  developer: Unit
  supportunit: Unit!
  color: String!
  deprecated: Boolean!
  hidden: Boolean!
  owner: Department
  domains: [String]
  ratings: Ratings
  externalstatistics: ExternalStatistics
  tags: [Tag]
  alternatives: [AppDetails]
  priceatvendor: String
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
`;

export const types = `
  type App {
    ${appFields}
    hasboughtplan: Boolean
  }

  type AppAssessment {
    id: ID!
    type: String!
    text: String!
    unitid: Unit!
    appid: App!
  }

  type ExecuteApp {
    ${appFields}
    internaldata: JSON
  }

  type Tag {
    name: String!
    weight: Int!
  }

  type Ratings {
    overallRating: Float
    combinedCustomerSupportRating: Float
    combinedEaseOfUseRating: Float
    combinedFunctionalityRating: Float
    valueForMoneyRating: Float
    recommendationRating: Float
    easeOfSetupRating: Float
    easeOfAdminRating: Float
    externalReviewCount: Int
  }

  type JobIndustryDistribution {
    Business: Float
    Accounting: Float
    Administration: Float
    ResearchAndDevelopment: Float
    CustomerRelations: Float
    Design: Float
    Education: Float
  }

  type ExternalStatistics {
    jobDistribution: JobIndustryDistribution
    industryDistribution: JobIndustryDistribution
    companySizes: JSON
  }

  type CompanyServiceNEW {
    id: ID!
    app: AppDetails!
    licences: [LicenceAssignment]
    teams: [TeamBoughtPlan]
  }

  type CompanyService {
    app: AppDetails!
    orbitids: [Orbit]
  }

  type Orbit {
    id: ID!
    buytime: String
    alias: String
    endtime: String
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
    assessments: [AppAssessment]
    quotes: [Quote]
  }

  type Quote {
    id: ID!
    name: String!
    quote: String!
    appid: AppDetails!
    job: String!
    industry: String!
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
    internaldata: JSON
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

  type LicenceOld {
    ${basicLicenceFields}
    ${licenceFields}
    tags: [String]
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

  type Licence {
    ${basicLicenceFields}
    ${licenceFields}
    agreed: Boolean
    disabled: Boolean
    key: JSON
    alias: String
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
    tags: [String]
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
    color: String
    squareImages: [Upload]
  }

  type IDID {
    appid: ID!
    planid: ID!
  }

  type MarketplaceResponse {
    apps: [AppDetails]!
    categories: [String]!
  }
`;

export const queries = `
  # Returns all apps in Vipfy
  allApps(limit: Int, offset: Int, sortOptions: SortOptions): [AppDetails]!
  fetchMarketplaceApps(limit: Int, offset: Int, sortOptions: SortOptions): [AppDetails]!
  fetchMarketplaceAppsByTag(tag: String!, limit: Int, offset: Int): [AppDetails!]!

  # Returns a specific app by id
  fetchAppById(id: ID!): AppDetails
  fetchAppNameByID(id: ID!): AppDetails
  fetchAppsByName(names: [String!]!): [AppDetails]!

  fetchAppByDomain(domain: String, hostname: String): AppDetails
  fetchLicenceAssignmentsByDomain(domain: String, hostname: String): [LicenceAssignment]

  # Returns all Apps a department is allowed to distribute Licences for
  fetchUnitApps(departmentid: ID!): [AppBoughtPlanResponse]!

  # Returns a single licence belonging to your company, requires admin rights
  fetchLicence(licenceid: ID!): Licence!
  
  fetchLicenceAssignment(assignmentid: ID!): LicenceAssignment!

  # Returns all Licences of a defined user
  fetchUserLicences(unitid: ID!): [LicenceOld]

  # Returns all LicenceAssignments of a defined user
  fetchUserLicenceAssignments(unitid: ID): [LicenceAssignment]

  fetchUnitAppsSimpleStats(departmentid: ID!): [SimpleStats]
  fetchSupportRequests: JSON
  fetchTotalAppUsage(starttime: Date, endtime: Date): [AppUsage]!

  # Total time spend in a specific boughtplan at some time, broken down by user
  fetchBoughtplanUsagePerUser(starttime: Date!, endtime: Date!, boughtplanid: ID!): [BoughtplanUsagePerUser]!

  fetchTotalUsageMinutes(starttime: Date, endtime: Date, assignmentid: ID, licenceid: ID, boughtplanid: ID, unitid: ID): Int

  fetchCompanyServices: [CompanyService]
  fetchCompanyService(serviceid: ID!): CompanyService

  fetchUseableApps: [AppDetails]

  fetchExecutionApps(appid: ID): [ExecuteApp]

  fetchOrbitsOfPlan(planid: ID!): [Orbit]

  fetchOrbit(orbitid: ID!): Orbit
`;

export const mutations = `
  sendSupportRequest(topic: String!, description: String!, component: String!, internal: Boolean!): Boolean!
  sendDownloadLink(email: String!, isMac: Boolean): Boolean!
  createOwnApp(ssoData: SSOInput!): IDID
  searchMarketplace(searchTerm: String!): MarketplaceResponse!
  createCategoriesFile: Boolean!

  # Deletes a licence on a set date, if it is after the normal cancel period
  # deprecated
  deleteLicenceAt(licenceid: ID!, time: Date!): Date!

  # Agree to all terms and conditions of a licence
  agreeToLicence(licenceid: ID!): Response!

  trackMinutesSpent(assignmentid: ID!, minutes: Int!): Response!

  failedIntegration(data: SSOResult!): ID!
  requestIntegration(data: JSON!): Boolean
  confirmIntegration(data: JSON!): Boolean
  sendFailedIntegrationRequest(appid: ID!): Boolean

  # Register a vote for the next app to implement
  voteForApp(app: String!): Response!

  createService(serviceData: JSON!, addedTeams: [JSON]!, addedEmployees: [JSON]!):Boolean!
  deleteService(serviceid: ID!): Boolean!

  updateLicenceSpeed(licenceid: ID!, speed: Int!, working: Boolean!, oldspeed: Int): Boolean!

  createAccount(orbitid: ID!, alias: String, logindata: JSON!, starttime: Date, endtime: Date, options: JSON): Account!
  changeAccount(accountid: ID!, alias: String, logindata: JSON, starttime: Date, endtime: Date, options: JSON): Account

  assignAccount(licenceid: ID!, userid: ID!, rights: LicenceRights, tags: [String], starttime: Date, endtime: Date, keyfragment: JSON): Boolean!
  terminateAssignAccount(assignmentid: ID!, endtime: Date, isNull: Boolean): LicenceAssignment

  createOrbit(planid: ID!, alias: String, options: JSON, starttime: Date, endtime: Date): BoughtPlan
  changeOrbit(orbitid: ID!, alias: String, loginurl: String, starttime: Date, endtime: Date, selfhosting: Boolean): Orbit!

  createVacation(userid: ID!, starttime: Date, endtime: Date, assignments: [JSON]): Vacation
  editVacation(vacationid: ID!, starttime: Date, endtime: Date, assignments: [JSON]): Vacation

  saveExecutionPlan(appid: ID!, key: String!, script: JSON!): ExecuteApp!

  saveCookies(cookies: JSON): Boolean

  checkEmployeeOrbit(appid: ID!): ID!
  `;
