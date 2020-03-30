const departmentFields = `
  name: String!
  legalinformation: JSON
  unitid: Unit!
  promocode: String
  setupfinished: Boolean
  iscompany: Boolean
  isprivate: Boolean
  internaldata: JSON
`;

export const types = `
  type ParentUnit {
    parentunit: Unit!
    childunit: Unit!
    position: String
  }

  type Right {
    holder: PublicUser!
    forunit: PublicUser
    type: String!
  }

  type Department {
    id: ID!
    ${departmentFields}
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    employees: Int
    managelicences: Boolean
    apps: JSON
    domains: [Domain]
    createdate: String!
    adminkey: [Key]
  }

  type DepartmentData {
    ${departmentFields}
    statisticdata: JSON
  }

  type DepartmentEmail {
    email: String!
    verified: Boolean!
    autogenerated: Boolean!
    description: String
    priority: Int
    tags: [String]
    departmentid: Unit
    emailownerid: Unit
  }

  type DepartmentEmployee {
    id: Department!
    childid: Unit
    employee: SemiPublicUser
  }

  input HumanName {
    title: String!
    firstname: String!
    middlename: String!
    lastname: String!
    suffix: String!
  }

  input ProposalInput {
    formatted_address: String
    name: String
    international_phone_number: String
    website: String
    address_components: [JSON]
    promocode: String
  }

  input StatisticInput {
    industry: String
    country: String
    subIndustry: String
    companyStage: String
  }
`;

export const queries = `
  # Returns the users company
  fetchCompany: Department!
  fetchDepartmentsData: [DepartmentDataResponse]!

  # Returns the amount of units in a Department
  fetchEmployees: [DepartmentEmployee]!
  fetchVacationRequests(userid: ID): [VacationUser]!

  fetchUserSecurityOverview(userid: ID): [UserSecurityOverview]!
  fetchVipfyPlan: BoughtPlan
`;

export const mutations = `
  setVatID(vatID: String!): Department!
  editDepartmentName(departmentid: ID!, name: String!): Response!
  createEmployee(name: HumanName!, emails: [EmailInput!]!, password: String, needpasswordchange: Boolean, file: Upload, birthday: Date, hiredate: Date, address: AddressInput, position: String, phones: [PhoneInput], passkey: String!, passwordMetrics: PasswordMetricsInput!, personalKey: KeyInput!, passwordsalt: String!): SemiPublicUser!
  deleteUser(userid: ID!, autodelete: Boolean): Boolean!

  # (un)makes user an admin of their company
  addAdmin(unitid: ID!, adminkey: KeyInput!): SemiPublicUser!
  removeAdmin(unitid: ID!): SemiPublicUser!

  # force the given users to change their password on next login
  forcePasswordChange(userids: [ID]!): Response!
  addPromocode(promocode: String!): Boolean!
  applyPromocode(promocode: String!): Response!
  banEmployee(userid: ID!): Response!
  unbanEmployee(userid: ID!): Response!
  updateCompanyPic(file: Upload!): Department!

  approveVacationRequest(userid: ID!, requestid: ID!): Boolean!
  declineVacationRequest(userid: ID!, requestid: ID!): Boolean!
`;

// banEmployee, unbanEmployee unused but maybe useful?  createEmployee only used once
