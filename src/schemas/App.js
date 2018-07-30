export const types = `
  type App {
    id: Int!
    name: String!
    commission: JSON
    icon: String
    loginurl: String
    description: String
    teaserdescription: String
    website: String
    disabled: Boolean!
    logo: String
    images: [String]
    features: JSON
    options: JSON
    developer: Unit!
    supportunit: Unit!
  }

  type AppDetails {
    id: Int!
    name: String
    developername: String!
    icon: String
    loginurl: String
    commission: JSON
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
  }

  input AppInput {
    name: String
    developername: String
    commission: String
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
`;

export const queries = `
  # Returns all apps in Vipfy
  allApps(limit: Int, offset: Int, sortOptions: SortOptions): [AppDetails]!

  # Returns a specific app
  fetchApp(name: String!): AppDetails
  fetchAppById(id: Int!): AppDetails

  fetchPrice(appid: Int!): Plan!
  fetchUnitApps(departmentid: Int!): [AppBoughtPlanResponse]!

  fetchLicences(licenceid: Int): [Licence]!
  fetchUsersOwnLicences(unitid: Int!): [Licence]
  fetchDomains: [Licence]!
`;

export const mutations = `
  createApp(app: AppInput!, file: File, file2: File, files: [File]): Response!
  updateApp(supportid: Int, developerid: Int, appid: Int!, app: AppInput, file: File): Response!
  deleteApp(id: Int!): Response!
  toggleAppStatus(id: Int!): Response!
  getDD24Login: DD24Response!

  distributeLicenceToDepartment(departmentid: Int!, boughtplanid: Int!, licencetype: String!): DistributeResponse!
  revokeLicencesFromDepartment(departmentid: Int!, boughtplanid: Int!): Response!
  distributeLicence(boughtplanid: Int!, unitid: Int!, departmentid: Int!): DistributeResponse!
  revokeLicence(licenceid: Int!): Response!
`;
