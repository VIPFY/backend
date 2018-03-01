export const types = `
  type Review {
    id: Int!
    unitid: Unit!
    appid: App!
    reviewdate: String!
    stars: Int
    reviewtext: String
    answerto: Review
    humanid: Human!
    counthelpful: Int,
    countunhelpful: Int,
    countcomment: Int,
  }

  type ReviewHelpful {
    reviewid: Review!
    unitid: Unit!
    comment: String
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
  writeReview(appid: Int!, stars: Int!, text: String): ReviewResponse!

# Rate a review
  rateReview(reviewid: Int!, userid: Int!, balance: Int!): ReviewResponse!
`;
