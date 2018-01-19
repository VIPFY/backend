import { executeQuery, testDefault } from "./helper";
import { dummyReviewSimple, dummyReview } from "./dummies";
import { allReviews, fetchReview } from "./queries";

const tests = [
  {
    description: "allReviews should fetch all Reviews",
    operation: allReviews,
    name: "allReviews",
    dummy: dummyReviewSimple,
    arrayTest: true
  },
  {
    description:
      "fetchReview should fetch all Reviews which belong to a specific app",
    operation: fetchReview,
    name: "fetchReview",
    dummy: dummyReview,
    args: {
      appid: 1
    },
    arrayTest: true
  }
];

describe("Query ", () => tests.map(test => testDefault(test)));
