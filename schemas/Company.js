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
`;

export const queries = `
allCompanies: [Company!]!
fetchCompany(id: Int!): Company!
`;

export const mutations = `
`;
