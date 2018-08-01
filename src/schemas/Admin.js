export const queries = `
  adminFetchLicence(licenceid: Int!): Licence!
  adminFetchLicences(id: Int!, limit: Int, offset: Int): [Licence]!
  adminFetchBoughtPlans(company: Int!, user: Int!): [BoughtPlan]!

  # Returns all Users for messages
  allUsers(limit: Int, offset: Int): [User]!
  # Checks whether the user is an admin
  admin: User

  # Returns an user. Should only be usable by an admin
  fetchUser(id: Int!): User!
  fetchRecentLogs(user: Int!): [Log]!
  allDepartments: [Department]!
  adminFetchEmployees(unitid: Int!, limit: Int, offset: Int): [DepartmentEmployee]!
  fetchCompany(id: Int!): Department!
  allCompanies(limit: Int, offset: Int): [Department]!
  freeUsers: [User]!
  adminFetchListLength: ListCountResponse!
  adminFetchDepartments(company: Int!, limit: Int, offset: Int): [DepartmentDataResponse]!
`;

export const mutations = `
  addAppToStride(appId: Int!, appName: String!): Response!
  adminCreateLicence(licenceData: JSON!): Response!
  adminUpdateLicence(unitid: Int!, boughtplanid: Int! licenceData: JSON!): Response!
  adminUpdateAddress(addressData: AddressInput!, id: Int!): Response!
  adminDeleteAddress(id: Int!): Response!

  adminCreatePlan(plan: PlanInput!, appId: Int!): Response!
  adminUpdatePlan(id: Int!, plan: PlanInput!): Response!

  adminCreateEmail(email: String!, unitid: Int!): Response!
  adminDeleteEmail(email: String!,unitid: Int!): Response!
  adminCreateCompany(company: CompanyInput!, file: File): Response!
  adminUpdateUser(user: UserInput, file: File, unitid: Int!): Response!
  # Deletes an unit, checks if unit is an user or a company
  adminDeleteUnit(unitid: Int!): Response!

  # Freeze the account of an user
  freezeAccount(unitid: Int!): Response!
  adminAddEmployee(unitid: Int!, company: Int!): Response!
  adminRemoveEmployee(unitid: Int!, company: Int!): Response!

  adminRemoveLicence(licenceid: Int!): Response!

  adminFetchUser(name: String!): [User!]
`;
