export const types = `
# Payment plans from the Apps
type Plan {
  id: Int!
  appid: Int!
  description: String
  renewalplan: String
  period: Int
  numlicences: Int
  price: String
  currency: String
  name: String
  app: App!
}
`;

export const queries = `
fetchPlans(appid: Int!): [Plan]!
`;

export const mutations = ``;
