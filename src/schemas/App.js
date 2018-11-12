export const types = `
  type App {
    id: Int!
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
  }

  type AppDetails {
    id: Int!
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
    images: [String]
    features: JSON
    options: JSON
    disabled: Boolean
    developer: Int
    supportunit: Int
  }

  type Licence {
    id: Int!
    options: JSON
    starttime: String!
    endtime: String
    agreed: Boolean
    disabled: Boolean
    key: JSON
    boughtplanid: BoughtPlan!
    unitid: Unit
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
`;

export const queries = `
  # Returns all apps in Vipfy
  allApps(limit: Int, offset: Int, sortOptions: SortOptions): [AppDetails]!

  # Returns a specific app by id
  fetchAppById(id: Int!): AppDetails

  # Returns all Apps a department is allowed to distribute Licences for
  fetchUnitApps(departmentid: Int!): [AppBoughtPlanResponse]!

  # Returns all Licences of the current user, optionally limited to a single licence id
  fetchLicences(licenceid: Int): [Licence]!

  # Returns all Licences of a current user that are not department licences
  fetchUsersOwnLicences(unitid: Int!): [Licence]

  fetchUnitAppsSimpleStats(departmentid: Int!): [SimpleStats]

  fetchSupportToken:String
`;

export const mutations = `
  # Admin: delete App from database
  deleteApp(id: Int!): Response!

  # Admin: toogle App between disabled and enabled
  toggleAppStatus(id: Int!): Response!

  # Add the boughtplan as departmentapp and give each empoyee a licence
  distributeLicenceToDepartment(departmentid: Int!, boughtplanid: Int!, licencetype: String!): DistributeResponse!

  # Revoke licence from everyone in department
  revokeLicencesFromDepartment(departmentid: Int!, boughtplanid: Int!): Response!

  # Give a user a licence from the licence pool of department
  distributeLicence(boughtplanid: Int!, unitid: Int!, departmentid: Int!): DistributeResponse!

  # Free the licence
  revokeLicence(licenceid: Int!): Response!

  # Agree to all terms and conditions of a licence
  agreeToLicence(licenceid: ID!): Response!

  trackMinutesSpent(licenceid: ID!, minutes: Int!): Response!

  # Adds the data of an external App
  addExternalAccount(username: String!, password: String!, subdomain: String, appid: Int!): Response!

  removeExternalAccount(licenceid: Int!): Response!
  `;
