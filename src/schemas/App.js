export const types = `
  type App {
    id: Int!
    name: String!
    applogo: String
    description: String
    developerid: Int!
    modaltype: Int
    versionnumber: String
    updatedate: String
    teaserdescription: String
    ownpage: String
    supportphone: String
    supportwebsite: String
  }

  type AppImage {
    id: Int!
    appid: Int!
    link: String
    sequence: Int
  }

# A Developer is the creator of an App
  type Developer {
    id: Int!
    name: String!
    website: String
    legalwebsite: String
    bankaccount: String
  }

# Payment plans from the Apps
  type Plan {
    id: Int!
    appid: Int!
    app: App!
    description: String
    renewalplan: Int
    period: Int
    numlicences: Int
    price: Float
    currency: String
    name: String
    activefrom: String
    activeuntil: String
    promo: Int
    promovipfy: Float
    promodeveloper: Float
    promoname: String
    changeafter: Int
    changeplan: Int
  }
`;

export const queries = `
  allApps(first: Int): [App]!
  fetchApp(name: String!): App

  allAppImages: [AppImage]!
  fetchAppImages(appid: Int!): [AppImage!]

  allDevelopers: [Developer]!
  fetchDeveloper(id: Int!): Developer

  fetchPlans(appid: Int!): [Plan]!
  fetchPrice(appid: Int!): Plan!
`;

export const mutations = `

`;
