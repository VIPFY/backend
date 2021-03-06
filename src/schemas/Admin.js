export const queries = `
  # Returns all Users for messages
  allUsers(limit: Int, offset: Int): [User]!
  # Checks whether the user is an admin
  admin: User

  adminFetchAllApps(limit: Int, offset: Int, sortOptions: SortOptions): [AppDetails]!
  adminFetchAppById(id: ID!): AppDetails!
  allCompanies(limit: Int, offset: Int): [Department]!

  fetchServerStats: JsonResponse!

  adminFetchEmailData(emailid: ID!): JSON
  adminFetchInboundEmails:JSON
  adminFetchPendingIntegrations: [IDJsonResponse]
  adminFetchStudyData: JSON!
`;

export const mutations = `
  createApp(app: AppInput!, options: JSON): ID!
  uploadAppImages(images: [Upload!]!, appid: ID!): Boolean!
  deleteImage(image: String!, id: ID!, type: String!): Boolean!
  updateApp(supportid: ID, developerid: ID, appid: ID!, app: AppInput, options: AppOptions): AppDetails!
  createPlan(period: String!, planName: String!, price: String!, appid: ID!): Boolean
  cancelFinishStudy(participantID: ID!): Boolean!
  finishStudy(participantID: ID!): Boolean!
  createCategoriesFile: Boolean!
  processMarketplaceApps(file: Upload!): Boolean!
  requestVacationForEmployee(startDate: Date!, endDate: Date!, days: Float!, userid: ID!): VacationRequestResponse!
  requestHalfVacationDayForEmployee(day: Date!, userid: ID!): VacationRequestResponse!
  `;
