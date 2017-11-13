export const types = `
type Review {
  userid: Int!
  appid: Int!
  reviewdate: String
  stars: Int
  reviewtext: String
}
`;

export const queries = `
allReviews: [Review]!
fetchReview(appid: Int!): Review
`;

export const mutations = `

`;
