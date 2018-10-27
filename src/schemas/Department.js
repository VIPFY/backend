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
    manageemployees: Boolean
    managelicences: Boolean
    apps: JSON
    domains: [Domain]
    createdate: String!
  }

  type DepartmentData {
    name: String!
    legalinformation: JSON
    unitid: Unit!
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
    user: Int
    statisticdata: JSON
    legalinformation: LegalInput
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
  fetchCompanySize: Int!
  fetchEmployees: [DepartmentEmployee]!

  # Returns the address data fetched in sign-up process
  fetchAddressProposal(placeid: String!): JSON!

  fetchUserSecurityOverview: [UserSecurityOverview]!
`;

export const mutations = `
  updateCompanyPic(file: File!): String!
  updateStatisticData(data: StatisticInput!): Response!

  addSubDepartment(departmentid: Int! ,name: String!): Response!
  editDepartmentName(departmentid: Int!, name: String!): Response!
  deleteSubDepartment(departmentid: Int!): Response!

  addEmployee(unitid: Int!, departmentid: Int!): Response!
  addCreateEmployee(email: String!, password: String!, name: HumanName!, departmentid: Int!): Response!
  removeEmployee(unitid: Int!, departmentid: Int!): Response!
  fireEmployee(unitid: Int!): Response!

  # Saves data we fetched in the Business Advisor
  saveProposalData(data: ProposalInput!): Response!
`;
