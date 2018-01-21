export const types = `
  type Review {
    userid: Int
    user: User
    appid: Int!
    app: App
    reviewdate: String
    stars: Int
    reviewtext: String
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
  writeReview(userid: Int!, appid: Int!, stars: Int!, text: String): ReviewResponse!

# Rate a review
  rateReview(reviewid: Int!, userid: Int!, balance: Int!): ReviewResponse!
`;
