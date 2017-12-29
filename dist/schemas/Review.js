"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var types = exports.types = "\n  type Review {\n    userid: Int!\n    appid: Int!\n    reviewdate: String\n    stars: Int\n    reviewtext: String\n    user: User\n    answerto: Int\n  }\n\n  type ReviewHelpful {\n    reviewid: Int!\n    userid: Int!\n    helpfuldate: String\n    balance: Boolean\n  }\n";

var queries = exports.queries = "\n  allReviews: [Review]!\n  fetchReview(appid: Int!): [Review!]\n";

var mutations = exports.mutations = "\n# Create a review for an app\n  writeReview(userid: Int!, appid: Int!, stars: Int!, text: String): Response!\n\n# Rate a review\n  rateReview(reviewid: Int!, userid: Int!, balance: Boolean!): Response!\n\n";