import { random } from "lodash";
import { lorem } from "faker";
import { executeQuery, testDefault, testAuthentication, context } from "./helper";
import {
  dummyResponse,
  dummyReviewResponse,
  dummyRateReviewResponse,
  dummyReview,
  dummyReviewFail,
  dummyReviewFail2
} from "./dummies";
import { allReviews, fetchReviews } from "./queries";
import { writeReview, rateReview } from "./mutations";

/* eslint-disable array-callback-return */

const testQueries = [
  {
    description: "allReviews should fetch all Reviews",
    operation: allReviews,
    name: "allReviews",
    dummy: dummyReviewResponse,
    arrayTest: true
  },
  {
    description: "fetchReviews should fetch all Reviews which belong to a specific app",
    operation: fetchReviews,
    name: "fetchReviews",
    dummy: dummyReviewResponse,
    args: {
      appid: 4
    },
    arrayTest: true
  }
];

const testMutations = [
  {
    description: "writeReview should return true when it was successful",
    operation: writeReview,
    name: "writeReview",
    dummy: dummyResponse,
    args: dummyReview
  },
  {
    description:
      "writeReview should return an error when the rating is higher than 5 or lower then 1",
    operation: writeReview,
    name: "writeReview",
    args: dummyReviewFail,
    errorTest: true
  },
  {
    description: "writeReview should return an error when the app doesn't exist",
    operation: writeReview,
    name: "writeReview",
    args: dummyReviewFail2,
    errorTest: true
  },
  {
    description: "rateReview should throw an error if the review doesn't exist",
    operation: rateReview,
    name: "rateReview",
    args: {
      reviewid: 100000,
      balance: 1
    },
    errorTest: true
  }
];

describe("Query", () => testQueries.map(test => testDefault(test)));

describe("Mutation", () => {
  const unneccessaryTests = [];

  testMutations.map(test => {
    testDefault(test);
    if (!unneccessaryTests.includes(test.name)) {
      testAuthentication(test);
    }
    unneccessaryTests.push(test.name);
  });
});

describe("This workflow", () => {
  test("should create a review, let it be rated, try to give the same rating again and change the rating", async () => {
    const appid = 2;
    const stars = random(1, 5);
    const test = lorem.sentence();

    const createAppReview = await executeQuery(writeReview, { appid, stars, test }, context);

    await expect(createAppReview.errors).toBeUndefined();
    await expect(createAppReview.data.writeReview).toEqual(dummyResponse);

    const rateNewReview = await executeQuery(
      rateReview,
      {
        reviewid: 41,
        balance: 1
      },
      context
    );

    await expect(rateNewReview.errors).toBeUndefined();
    await expect(rateNewReview.data.rateReview).toEqual(dummyRateReviewResponse);

    const rateReviewAgainFail = await executeQuery(
      rateReview,
      {
        reviewid: 41,
        balance: 1
      },
      context
    );

    await expect(rateReviewAgainFail.errors).toBeDefined();
    await expect(rateReviewAgainFail.data).toBe(null);

    const rateReviewAgain = await executeQuery(
      rateReview,
      {
        reviewid: 41,
        balance: 2
      },
      context
    );

    await expect(rateReviewAgain.errors).toBeUndefined();
    await expect(rateReviewAgain.data.rateReview).toEqual(dummyRateReviewResponse);
  });
});
