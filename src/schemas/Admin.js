export const queries = `
  adminFetchLicence(licenceid: Int!): Licence!
  adminFetchLicences(id: Int!, limit: Int, offset: Int): [Licence]!
  adminFetchBoughtPlans(company: Int!, user: Int!): [BoughtPlan]!

  # Returns all Users for messages
  allUsers(limit: Int, offset: Int): [User]!
  # Checks whether the user is an admin
  admin: User

  adminFetchAllApps(limit: Int, offset: Int, sortOptions: SortOptions): [AppDetails]!
  adminFetchAppById(id: ID!): AppDetails!
  adminFetchPlans(appid: Int!): [Plan]!
  adminFetchPlan(planid: Int!): Plan!
  # Returns an user. Should only be usable by an admin
  fetchUser(id: Int!): User!
  fetchRecentLogs(user: Int!): [Log]!
  allDepartments: [Department]!
  adminFetchUserAddresses: [Address]!
  adminFetchEmployees(unitid: Int!, limit: Int, offset: Int): [DepartmentEmployee]!
  adminFetchCompany(id: Int!): Department!
  allCompanies(limit: Int, offset: Int): [Department]!
  freeUsers: [User]!
  listStripeInvoices: JSON
  adminFetchListLength: ListCountResponse!
  adminFetchDepartments(company: Int!, limit: Int, offset: Int): [DepartmentDataResponse]!

  # fetch perfomance statistics for this specific server
  fetchServerStats: JsonResponse!
`;

export const mutations = `
  createApp(app: AppInput!, logo: Upload!, icon: Upload!, pics: [Upload!]!): Response!
  updateApp(supportid: Int, developerid: Int, appid: Int!, app: AppInput, pic: Upload): Response!
  adminCreateLicence(licenceData: JSON!): Response!
  adminUpdateLicence(unitid: Int!, boughtplanid: Int! licenceData: JSON!): Response!
  adminUpdateAddress(addressData: AddressInput!, id: Int!): Response!
  adminDeleteAddress(id: Int!): Response!

  adminCreatePlan(plan: PlanInput!, appId: Int!): Response!
  adminUpdatePlan(id: Int!, plan: PlanInput!): Response!
  adminEndPlan(id: Int!, enddate: String!): Response!

  adminCreateEmail(email: String!, unitid: Int!): Response!
  adminDeleteEmail(email: String!,unitid: Int!): Response!
  adminCreateCompany(company: CompanyInput!, profilepic: Upload): Response!
  adminUpdateUser(user: UserInput, profilepic: Upload, unitid: Int!): Response!
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
