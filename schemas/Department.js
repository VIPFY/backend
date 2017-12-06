export const types = `
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
allDepartments: [Department!]!
fetchDepartment(departmentId: Int!): Department!
fetchDepartmentsByCompanyId(companyId: Int!): [Department!]
`;
