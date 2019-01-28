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

  type Licence {
    id: ID!
    options: JSON
    starttime: String!
    endtime: Date
    agreed: Boolean
    disabled: Boolean
    key: JSON
    boughtplanid: BoughtPlan!
    unitid: User
    layouthorizontal: Int
    layoutvertical: Int
  }

  input LicenceInput {
    id:  ID!
    disabled: Boolean
    endtime: Date
    layouthorizontal: Int
    layoutvertical: Int
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
    totalminutes: Int
  }

  type BoughtplanUsagePerUser {
    boughtplan: BoughtPlan!
    unit: PublicUser!
    totalminutes: Int
    licenceenddates: [String]
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

  fetchUnitAppsSimpleStats(departmentid: ID!): [SimpleStats]

  fetchSupportToken: String
  fetchAppIcon(licenceid: ID!): TabResponse!

  # The total minutes spend per app, this month, combined for all users of the company
  fetchTotalAppUsage: [AppUsage]!

  # Total time spend in a specific boughtplan at some time, broken down by user
  fetchBoughtplanUsagePerUser(starttime: Date!, endtime: Date!, boughtplanid: ID!): [BoughtplanUsagePerUser]!
`;

export const mutations = `
  # Admin: delete App from database
  deleteApp(id: ID!): Response!

  # Admin: toogle App between disabled and enabled
  toggleAppStatus(id: ID!): Response!

  # Add the boughtplan as departmentapp and give each empoyee a licence
  distributeLicenceToDepartment(departmentid: ID!, boughtplanid: ID!, licencetype: String!): DistributeResponse!

  # Revoke licence from everyone in department
  revokeLicencesFromDepartment(departmentid: ID!, boughtplanid: ID!): Response!

  # Give an user a licence from the licence pool of department
  distributeLicence(licenceid: ID!, unitid: ID!, departmentid: ID!): DistributeResponse!

  revokeLicence(licenceid: ID!): Response!
  # Remove the user from a licence and optionally delete the key
  suspendLicence(licenceid: ID!, fromuser: ID, clear: Boolean): Response!
  # Delete the key from a licence
  clearLicence(licenceid: ID!): Response!
  # Deletes a licence on a set date, if it is after the normal cancel period
  deleteLicenceAt(licenceid: ID!, time: Date!): Date!
  # Deletes a boughtPlan on a set date, if it is after the normal cancel period
  deleteBoughtPlanAt(boughtplanid: ID!, time: Date!): Date!

  # Agree to all terms and conditions of a licence
  agreeToLicence(licenceid: ID!): Response!

  trackMinutesSpent(licenceid: ID!, minutes: Int!): Response!

  # Adds the data of an external App
  addExternalBoughtPlan(appid: ID!, alias: String, price: Float, loginurl: String): BoughtPlan!
  addExternalLicence(username: String!, password: String!, appid: ID!, boughtplanid: ID!, price: Float, loginurl: String, touser: ID): Response!

  # Register a vote for the next app to implement
  voteForApp(app: String!): Response!

  # Updates the login data of an external app
  updateCredentials(licenceid: ID!, username: String, password: String): Boolean!
  `;
