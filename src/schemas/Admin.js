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
`;
