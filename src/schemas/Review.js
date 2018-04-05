export const types = `
  type Review {
    id: Int!
    unitid: User!
    appid: App!
    reviewdate: String!
    stars: Int
    reviewtext: String
    answerto: Review
    counthelpful: Int
    countunhelpful: Int
    countcomment: Int
  }

  type ReviewHelpful {
    reviewid: Review!
    unitid: User!
    comment: String
    helpfuldate: String!
    balance: Int
  }
`;

export const queries = `
  allReviews: [Review]!
  fetchReview(appid: Int!): [Review!]
`;

export const mutations = `
# Create a review for an app
  writeReview(appid: Int!, stars: Int!, text: String): Response!

# Rate a review
  rateReview(reviewid: Int!, userid: Int!, balance: Int!): ReviewResponse!
`;
