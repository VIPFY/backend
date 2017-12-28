export const types = `
  type Review {
    userid: Int!
    appid: Int!
    reviewdate: String
    stars: Int
    reviewtext: String
    user: User
    answerto: Int
  }

  type ReviewHelpful {
    reviewid: Int!
    userid: Int!
    helpfuldate: String
    balance: Boolean
  }
`;

export const queries = `
  allReviews: [Review]!
  fetchReview(appid: Int!): [Review!]
`;

export const mutations = `

`;
