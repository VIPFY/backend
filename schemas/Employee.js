export const types = `
# An Employee is an user who belongs to at least one company
type Employee {
  companyid: Int!
  departmentid: Int!
  userid: Int!
  begindate: String
  enddate: String
  position: String
  user: User
}`;

export const queries = `
allEmployees: [Employee!]!
fetchEmployee(userId: Int!): Employee!
`;
