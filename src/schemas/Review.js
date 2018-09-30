export const types = `
  type Review {
    id: ID!
    unitid: PublicUser!
    appid: App!
    reviewdate: String!
    stars: Int
    reviewtext: String
    answerto: Review
    counthelpful: Int
    countunhelpful: Int
    countcomment: Int
  }

  type ReviewData {
    id: ID!
    unitid: PublicUser!
    appid: App!
    reviewdate: String!
    stars: Int
    reviewtext: String
    answerto: Review
  }

  type ReviewHelpful {
    reviewid: Review!
    unitid: PublicUser!
    comment: String
    helpfuldate: String!
    balance: Int
  }
`;

export const queries = `
  allReviews: [Review]!

  # Finds all Reviews belonging to an app
  fetchReviews(appid: Int!): [Review!]
`;

export const mutations = `
# Create a review for an app
  writeReview(appid: Int!, stars: Int!, text: String): Review!

# Rate a review
  rateReview(reviewid: Int!, balance: Int!): ReviewResponse!
`;
