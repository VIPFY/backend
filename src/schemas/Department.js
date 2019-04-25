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
    name: String!
    legalinformation: JSON
    unitid: Unit!
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    employees: Int
    employeedata: [PublicUser]!
    managelicences: Boolean
    apps: JSON
    domains: [Domain]
    createdate: String!
    promocode: String
    setupfinished: Boolean
    iscompany: Boolean
    internaldata: JSON
  }

  type DepartmentData {
    name: String!
    legalinformation: JSON
    unitid: Unit!
    promocode: String
    setupfinished: Boolean
    iscompany: Boolean
    statisticdata: JSON
    internaldata: JSON
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
    employee: PublicUser
  }

  input CompanyInput {
    name: String
    user: ID
    statisticdata: JSON
    legalinformation: LegalInput
    placeid: String
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

  input LegalInput {
    vatId: String
    termsOfService: Date!
    privacy: Date!
    noVatRequired: Boolean!
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
  fetchDepartments: [DepartmentResponse]!
  fetchDepartmentsData: [DepartmentDataResponse]!

  # Returns the amount of units in a Department
  fetchCompanySize: ID!
  fetchEmployees: [DepartmentEmployee]!

  # Returns the address data fetched in sign-up process
  fetchAddressProposal(placeid: String!): JSON!

  fetchUserSecurityOverview: [UserSecurityOverview]!
  fetchVipfyPlan: BoughtPlan
`;

export const mutations = `
  updateCompanyPic(file: Upload!): String!
  updateStatisticData(data: StatisticInput!): Response!

  addSubDepartment(departmentid: ID!, name: String!): Response!
  editDepartmentName(departmentid: ID!, name: String!): Response!
  deleteSubDepartment(departmentid: ID!): Response!

  addEmployee(unitid: ID!, departmentid: ID!): Response!
  addCreateEmployee(email: String!, password: String!, name: HumanName!, departmentid: ID!): Response!
  removeEmployee(unitid: ID!, departmentid: ID!): Response!
  fireEmployee(unitid: ID!): Response!

  # Saves data we fetched in the Business Advisor
  saveProposalData(data: ProposalInput!): Response!

  # (un)makes user an admin of their company
  changeAdminStatus(unitid: ID!, admin: Boolean!): Response!

  # force the given users to change their password on next login
  forcePasswordChange(userids: [ID]!): Response!

  applyPromocode(promocode: String!): Response!
  banEmployee(userid: ID!): Response!
  unbanEmployee(userid: ID!): Response!
`;
