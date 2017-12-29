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
# Create a review for an app
  writeReview(userid: Int!, appid: Int!, stars: Int!, text: String): Response!

# Rate a review
  rateReview(reviewid: Int!, userid: Int!, balance: Int!): Response!

`;
