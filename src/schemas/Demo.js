export const queries = `
  fetchRecommendedApps: [App]!
`;

export const mutations = `
  triggerTestJob: Boolean!
  respondToNotification(id: ID!, data: JSON!): Boolean!
`;
