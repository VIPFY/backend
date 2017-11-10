export const types = `
type Developer {
  id: Int!
  name: String!
  website: String
  legalwebsite: String
  bankaccount: String
}
`;

export const queries = `
allDevelopers: [Developer]!
findDeveloper: Developer
`;

export const mutations = `
  
`;
