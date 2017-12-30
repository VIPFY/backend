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
    family: Boolean
  }

# A department is a part of a company and is identified by an unique id
  type Department{
    id: Int!
    name: String
    companyid: Int
    company: Company
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
  fetchDepartment(id: Int!): Department!
  fetchDepartmentsByCompanyId(companyId: Int!): [Department!]
`;

export const mutations = `
`;
