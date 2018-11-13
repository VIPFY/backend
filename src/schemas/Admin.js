export const queries = `
  adminFetchLicence(licenceid: ID!): Licence!
  adminFetchLicences(id: ID!, limit: Int, offset: Int): [Licence]!
  adminFetchBoughtPlans(company: ID!, user: ID!): [BoughtPlan]!

  # Returns all Users for messages
  allUsers(limit: Int, offset: Int): [User]!
  # Checks whether the user is an admin
  admin: User

  adminFetchAllApps(limit: Int, offset: Int, sortOptions: SortOptions): [AppDetails]!
  adminFetchAppById(id: ID!): AppDetails!
  adminFetchPlans(appid: ID!): [Plan]!
  adminFetchPlan(planid: ID!): Plan!
  # Returns an user. Should only be usable by an admin
  fetchUser(id: ID!): User!
  fetchRecentLogs(user: ID!): [Log]!
  allDepartments: [Department]!
  adminFetchUserAddresses: [Address]!
  adminFetchEmployees(unitid: ID!, limit: Int, offset: Int): [DepartmentEmployee]!
  adminFetchCompany(id: ID!): Department!
  allCompanies(limit: Int, offset: Int): [Department]!
  freeUsers: [User]!
  listStripeInvoices: JSON
  adminFetchListLength: ListCountResponse!
  adminFetchDepartments(company: ID!, limit: Int, offset: Int): [DepartmentDataResponse]!

  # fetch perfomance statistics for this specific server
  fetchServerStats: JsonResponse!
`;

export const mutations = `
  createApp(app: AppInput!, file: File, file2: File, files: [File]): Response!
  updateApp(supportid: Int, developerid: Int, appid: Int!, app: AppInput, file: File): Response!
  adminCreateLicence(licenceData: JSON!): Response!
  adminUpdateLicence(unitid: Int!, boughtplanid: Int! licenceData: JSON!): Response!
  adminUpdateAddress(addressData: AddressInput!, id: Int!): Response!
  adminDeleteAddress(id: Int!): Response!

  adminCreatePlan(plan: PlanInput!, appId: ID!): Response!
  adminUpdatePlan(id: Int!, plan: PlanInput!): Response!
  adminEndPlan(id: Int!, enddate: String!): Response!

  adminCreateEmail(email: String!, unitid: Int!): Response!
  adminDeleteEmail(email: String!,unitid: Int!): Response!
  adminCreateCompany(company: CompanyInput!, file: File): Response!
  adminUpdateUser(user: UserInput, file: File, unitid: Int!): Response!
  adminCreateAddress(addressData: AddressInput!, unitid: Int!): Response!

  # Deletes an unit, checks if unit is an user or a company
  adminDeleteUnit(unitid: Int!): Response!

  # Freeze the account of an user
  freezeAccount(unitid: Int!): Response!
  adminAddEmployee(unitid: Int!, company: Int!): Response!
  adminRemoveEmployee(unitid: Int!, company: Int!): Response!

  adminRemoveLicence(licenceid: Int!): Response!

  adminFetchUser(name: String!): [User!]

  flushLocalCaches: Response!
`;
