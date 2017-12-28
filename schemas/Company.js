export const types = `
# A company will be identified by it's id and get's a default Department after creation
  type Company {
    id: Int!
    name: String!
    companylogo: String
    addresscountry: String
    addressstate: String
    addresscity: String
    addressstreet: String
    addressnumber: Int
  }

# A department is a part of a company and is identified by an unique id
  type Department{
    companyid: Int!
    departmentid: Int!
    name: String
    addresscountry: String
    addresscity: String
    addressstate: String
    addressstreet: String
    addressnumber: Int
  }
`;

export const queries = `
  allCompanies: [Company!]!
  fetchCompany(id: Int!): Company!
  allDepartments: [Department!]!
  fetchDepartment(departmentId: Int!): Department!
  fetchDepartmentsByCompanyId(companyId: Int!): [Department!]
`;

export const mutations = `
`;
