export const types = `
  type ParentUnit {
    parentunit: Unit!
    childunit: Unit!
  }

  type Right {
    holder: User!
    forunit: User
    type: String!
  }

  type Department {
    name: String!
    legalinformation: JSON
    statisticdata: JSON
    unitid: Unit!
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    employees: Int
    employeedata: [User]!
    payingoptions: JSON
    manageemployees: Boolean
    managelicences: Boolean
  }

  type DepartmentData {
    name: String!
    legalinformation: JSON
    statisticdata: JSON
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
    id: Unit!
    childid: Department
    employee: User
  }

  input CompanyInput {
    name: String!
    user: Int!
    statisticdata: JSON
  }
`;

export const queries = `
  fetchDepartments: [DepartmentResponse]!
  fetchDepartmentsData: [DepartmentDataResponse]!

# Returns the amount of units in a Department
  fetchCompanySize: Int!
`;

export const mutations = `
  createCompany(name: String!): RegisterResponse!
  updateStatisticData(data: JSON!): Response!
  addEmployee(unitid: Int!, departmentid: Int!): Response!
  addCreateEmployee(email: String!, departmentid: Int!): Response!
  addSubDepartment(departmentid: Int!): Response!
  removeEmployee(unitid: Int!, departmentid: Int!): Response!
  fireEmployee(unitid: Int!): Response!
`;
