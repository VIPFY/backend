export const types = `
  type App {
    id: ID!
    name: String!
    icon: String
    loginurl: String
    description: String
    teaserdescription: String
    needssubdomain: Boolean
    website: String
    disabled: Boolean!
    logo: String
    images: [String]
    features: JSON
    options: JSON
    developer: Unit!
    supportunit: Unit!
    color: String!
    deprecated: Boolean!
    hidden: Boolean!
    hasboughtplan: Boolean
    owner: Department
  }

  type CompanyService{
    id: ID!
    app: AppDetails!
    licences: [Licence]
    teams: [TeamBoughtPlan]
  }

  type AppDetails {
    id: ID!
    name: String
    developername: String!
    icon: String
    loginurl: String
    needssubdomain: Boolean
    logo: String
    description: String
    teaserdescription: String
    website: String
    images: [String]
    features: JSON
    options: JSON
    disabled: Boolean
    avgstars: Float
    cheapestprice: Float
    cheapestpromo: Float
    supportwebsite: String
    supportphone: String
    developerwebsite: String
    developer: Unit!
    supportunit: Unit!
    color: String!
    hidden: Boolean!
    owner: Unit
  }

  type TeamBoughtPlan {
    departmentid: Team
    boughtplanid: BoughtPlan
  }

  input AppInput {
    name: String
    developername: String
    commission: String
    color: String
    avgstars: Float
    supportphone: String
    supportwebsite: String
    developerwebsite: String
    description: String
    teaserdescription: String
    loginurl: String
    website: String
    external: Boolean
    disabled: Boolean
    needssubdomain: Boolean
    developer: ID
    supportunit: ID
    hidden: Boolean
    icon: Upload
    logo: Upload
    images: [Upload!]
    image: Upload
  }

  input SSOInput {
    images: [Upload]
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
    id: ID!
    licence: Licence!
    starttime: Date!
    endtime: Date
    agreed: Boolean
    alias: String
  }

  type Licence {
    id: ID!
    options: JSON
    starttime: String!
    endtime: Date
    agreed: Boolean
    disabled: Boolean
    pending: Boolean
    key: JSON
    boughtplanid: BoughtPlan!
    unitid: SemiPublicUser
    dashboard: Int
    sidebar: Int
    view: Boolean!
    edit: Boolean!
    delete: Boolean!
    use: Boolean!
    vacationstart: Date
    vacationend: Date
    tags: [String]
    teamlicence: Team
    teamaccount: Team
  }

  type PublicLicence {
    id: ID!
    starttime: String!
    endtime: Date
    options: JSON
    boughtplanid: BoughtPlan!
    unitid: PublicUser
    pending: Boolean
    dashboard: Int
    sidebar: Int
    tags: [String]
  }

  type TempLicence {
    id: ID!
    licenceid: PublicLicence!
    view: Boolean!
    edit: Boolean!
    delete: Boolean!
    use: Boolean!
    starttime: Date!
    endtime: Date!
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
  }

  type IDID {
    id: ID!
  }
`;

export const queries = `
  # Returns all apps in Vipfy
  allApps(limit: Int, offset: Int, sortOptions: SortOptions): [AppDetails]!
  fetchAllAppsEnhanced: [App]!

  # Returns a specific app by id
  fetchAppById(id: ID!): AppDetails

  # Returns all Apps a department is allowed to distribute Licences for
  fetchUnitApps(departmentid: ID!): [AppBoughtPlanResponse]!

  # Returns all Licences of the current user, optionally limited to a single licence id
  fetchLicences(licenceid: ID): [Licence]!

  # Returns all Licences of a current user that are not department licences
  fetchUsersOwnLicences(unitid: ID!): [Licence]

  # Returns all Licences of a defined user
  fetchUserLicences(unitid: ID!): [Licence]

  fetchUnitAppsSimpleStats(departmentid: ID!): [SimpleStats]

  fetchSupportToken: String

  fetchTotalAppUsage(starttime: Date, endtime: Date): [AppUsage]!

  # Total time spend in a specific boughtplan at some time, broken down by user
  fetchBoughtplanUsagePerUser(starttime: Date!, endtime: Date!, boughtplanid: ID!): [BoughtplanUsagePerUser]!

  fetchServiceLicences(employees: [ID!], serviceid: ID!): [ServiceLicence]
  fetchCompanyServices: [CompanyService]
  fetchCompanyService(serviceid: ID!): CompanyService

  fetchIssuedLicences(unitid: ID!): [TempLicence!]
  fetchTempLicences(unitid: ID!): [TempLicence!]
  bulkUpdateLayout(layouts: [LayoutInput!]!): Boolean!
`;

export const mutations = `
  updateLayout(layout: LayoutInput!): Licence!
  switchAppsLayout(app1: LayoutInput!, app2: LayoutInput!): [Licence!]!
  # Admin: delete App from database
  deleteApp(id: ID!): Response!

  createOwnApp(ssoData: SSOInput!, userids: [ID]): IDID
  giveTemporaryAccess(licences: [LicenceRightInput!]!): TempAccessResponse!
  updateTemporaryAccess(licence: LicenceRightUpdateInput, rightid: ID!): TempLicence!
  removeTemporaryAccess(rightid: ID!): Boolean!

  # Admin: toogle App between disabled and enabled
  toggleAppStatus(id: ID!): Response!

  # Give an user a licence from the licence pool of department
  distributeLicence(licenceid: ID!, unitid: ID!, departmentid: ID!): DistributeResponse!

  # Deletes a licence on a set date, if it is after the normal cancel period
  deleteLicenceAt(licenceid: ID!, time: Date!): Date!
  deleteServiceLicenceAt(serviceid: ID!, licenceid: ID!, time: Date!): Date!
  # Deletes a boughtPlan on a set date, if it is after the normal cancel period
  deleteBoughtPlanAt(boughtplanid: ID!, time: Date!): Date!

  # Agree to all terms and conditions of a licence
  agreeToLicence(licenceid: ID!): Response!

  trackMinutesSpent(licenceid: ID!, minutes: Int!): Response!

  # Adds the data of an external App
  addExternalBoughtPlan(appid: ID!, alias: String, price: Float, loginurl: String): BoughtPlan!
  addExternalLicence(username: String!, password: String!, appid: ID!, boughtplanid: ID!, price: Float, loginurl: String, touser: ID): Response!

  failedIntegration(data: SSOResult!): Boolean!

  # Register a vote for the next app to implement
  voteForApp(app: String!): Response!

  # Updates the login data of an external app
  updateCredentials(licenceid: ID!, username: String, password: String, loginurl: String): Boolean!

  createService(serviceData: JSON!, addedTeams: [JSON]!, addedEmployees: [JSON]!):Boolean!
  deleteService(serviceid: ID!): Boolean!
  removeLicence(licenceid: ID!, oldname: String!): Boolean!

  distributeLicence10(licenceid: ID!, userid: ID!): Boolean!

  addExternalAccountLicence(username: String!, password: String!, appid: ID, boughtplanid: ID!, price: Float, loginurl: String, touser: ID, identifier: String, options: JSON): Boolean!
  `;
