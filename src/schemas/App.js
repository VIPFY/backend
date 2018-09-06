export const types = `
  type App {
    id: Int!
    name: String!
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

  # Returns a specific app by name
  fetchApp(name: String!): AppDetails

  # Returns a specific app by id
  fetchAppById(id: Int!): AppDetails

  # Returns all Apps a department is allowed to distribute Licences for
  fetchUnitApps(departmentid: Int!): [AppBoughtPlanResponse]!

  # Returns all Licences of the current user, optionally limited to a single licence id
  fetchLicences(licenceid: Int): [Licence]!

  # Returns all Licences of a current user that are not department licences
  fetchUsersOwnLicences(unitid: Int!): [Licence]
`;

export const mutations = `
  deleteApp(id: Int!): Response!
  toggleAppStatus(id: Int!): Response!

  distributeLicenceToDepartment(departmentid: Int!, boughtplanid: Int!, licencetype: String!): DistributeResponse!
  revokeLicencesFromDepartment(departmentid: Int!, boughtplanid: Int!): Response!
  distributeLicence(boughtplanid: Int!, unitid: Int!, departmentid: Int!): DistributeResponse!
  revokeLicence(licenceid: Int!): Response!

  agreeToLicence(licenceid: ID!): Response!
`;
