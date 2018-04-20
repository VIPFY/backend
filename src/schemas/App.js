export const types = `
  type App {
    id: Int!
    name: String!
    commission: String
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
    commission: String
    logo: String
    description: String
    teaserdescription: String
    website: String
    images: [String]
    features: JSON
    options: JSON
    disabled: Boolean
    developer: Int
    supportunit: Int
  }
`;

export const queries = `
  # Returns all apps in Vipfy
  allApps(first: Int): [App]!

  # Returns a specific app
  fetchApp(name: String!): AppDetails

  # Returns apps where the given user has an account
  fetchUserApps: [BoughtPlan]!

  fetchPrice(appid: Int!): Plan!
`;

export const mutations = `
  createApp(app: AppInput!): Response!
  deleteApp(id: Int!): Response!
`;
