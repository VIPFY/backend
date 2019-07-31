export const queries = `
  # Returns all Users for messages
  allUsers(limit: Int, offset: Int): [User]!
  # Checks whether the user is an admin
  admin: User

  adminFetchAllApps(limit: Int, offset: Int, sortOptions: SortOptions): [AppDetails]!
  adminFetchAppById(id: ID!): AppDetails!
  allCompanies(limit: Int, offset: Int): [Department]!

  fetchServerStats: JsonResponse!
  fetchPendingIntegrations: [Licence]!
`;

export const mutations = `
  createApp(app: AppInput!, options: AppOptions): ID!
  uploadAppImages(images: [Upload!]!, appid: ID!): Boolean!
  deleteImage(image: String!, id: ID!, type: String!): Boolean!
  updateApp(supportid: ID, developerid: ID, appid: ID!, app: AppInput, options: AppOptions): AppDetails!

  adminCreatePlan(plan: PlanInput!, appId: Int!): Response!
  adminUpdatePlan(id: Int!, plan: PlanInput!): Response!
  adminEndPlan(id: Int!, enddate: String!): Response!

  adminUpdateUser(user: UserInput, profilepic: Upload, unitid: Int!): Response!

  # Deletes an unit, checks if unit is an user or a company
  adminDeleteUnit(unitid: Int!): Response!

  # Freeze the account of an user
  freezeAccount(unitid: Int!): Response!

  flushLocalCaches: Response!
`;
