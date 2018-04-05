export const types = `
  type Review {
    id: Int!
    reviewer: User!
    appid: App!
    reviewdate: String!
    stars: Int
    reviewtext: String
    answerto: Review
  }

  type ReviewHelpful {
    reviewid: Review!
    reviewer: User!
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
