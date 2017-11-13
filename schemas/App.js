export const types = `
type App {
  id: Int!
  name: String!
  applogo: String
  description: String
  developerid: Int!
}
`;

export const queries = `
allApps: [App]!
fetchApp(name: String!): App
`;

export const mutations = `

`;
