export const types = `
  type App {
    id: Int!
    name: String!
    commission: String
    logo: String
    description: String
    teaserdescription: String
    website: String
    images: [String]
    features: Features
    options: Options
    disabled: Boolean!
    developer: Unit!
    supportunit: Unit!
  }

  type AppDetails {
    id: Int!
    name: String
    developername: String!
    commission: Commision
    logo: String
    description: String
    teaserdescription: String
    website: String
    images: [String]
    features: Features
    options: Options
    disabled: Boolean
    avgstars: Float
    cheapestprice: Float
    cheapestpromo: Float
    supportwebsite: Float
    supportphone: String
    developerwebsite: String
    developer: Unit!
    supportunit: Unit!
  }

  type Features {
    a: String

  }

  type Commision {
    a: String

  }
`;

export const queries = `
  allApps(first: Int): [App]!
  fetchApp(name: String!): AppDetails

  fetchPlans(appid: Int!): [Plan]!
  fetchPrice(appid: Int!): Plan!
`;

export const mutations = `

`;
