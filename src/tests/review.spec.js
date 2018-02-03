import {
  executeQuery,
  testDefault,
  testAuthentication,
  user,
  token
} from "./helper";
import {
  dummyReviewSimpleResponse,
  dummyReviewResponse,
  dummyResponse,
  dummyResponseFailure,
  dummyRateReviewResponse,
  dummyRateReviewResponseFailure,
  dummyWriteReviewResponse,
  dummyWriteReviewResponseFailure,
  dummyReview,
  dummyReviewFail,
  dummyReviewFail2,
  dummyReviewFail3
} from "./dummies";
import { allReviews, fetchReview } from "./queries";
import { writeReview, rateReview } from "./mutations";
import { SECRET, SECRETTWO } from "../login-data";
import _ from "lodash";
import { lorem } from "faker";
import models from "../models";

const testQueries = [
  {
    description: "allReviews should fetch all Reviews",
    operation: allReviews,
    name: "allReviews",
    dummy: dummyReviewSimpleResponse,
    arrayTest: true
  },
  {
    description:
      "fetchReview should fetch all Reviews which belong to a specific app",
    operation: fetchReview,
    name: "fetchReview",
    dummy: dummyReviewResponse,
    args: {
      appid: 2
    },
    arrayTest: true
  }
];

const testMutations = [
  {
    description: "writeReview should return true when it was successful",
    operation: writeReview,
    name: "writeReview",
    dummy: dummyWriteReviewResponse,
    args: dummyReview
  },
  {
    description:
      "writeReview should return an error when the rating is higher than 5 or lower then 1",
    operation: writeReview,
    name: "writeReview",
    dummy: dummyWriteReviewResponseFailure,
    args: dummyReviewFail
  },
  {
    description:
      "writeReview should return an error when the app doesn't exist",
    operation: writeReview,
    name: "writeReview",
    dummy: dummyWriteReviewResponseFailure,
    args: dummyReviewFail2
  },
  {
    description:
      "writeReview should return an error when the user doesn't exist",
    operation: writeReview,
    name: "writeReview",
    dummy: dummyWriteReviewResponseFailure,
    args: dummyReviewFail3
  },
  {
    description: "rateReview should throw an error if the user doesn't exist",
    operation: rateReview,
    name: "rateReview",
    dummy: dummyRateReviewResponseFailure,
    args: {
      reviewid: 1,
      userid: 100000,
      balance: 1
    }
  },
  {
    description: "rateReview should throw an error if the review doesn't exist",
    operation: rateReview,
    name: "rateReview",
    dummy: dummyRateReviewResponseFailure,
    args: {
      reviewid: 100000,
      userid: 3,
      balance: 1
    }
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
    const stars = _.random(1, 5);
    const test = lorem.sentence();
    const rater = _.random(0, 99);

    const createAppReview = await executeQuery(
      writeReview,
      { userid: _.random(1, 99), appid, stars, test },
      { models, user, SECRET, SECRETTWO, token }
    );

    await expect(createAppReview.errors).toBeUndefined();
    await expect(createAppReview.data.writeReview).toEqual(
      dummyWriteReviewResponse
    );

    const rateNewReview = await executeQuery(
      rateReview,
      {
        reviewid: createAppReview.data.writeReview.id,
        userid: rater,
        balance: 1
      },
      { models, user, SECRET, SECRETTWO, token }
    );

    await expect(rateNewReview.errors).toBeUndefined();
    await expect(rateNewReview.data.rateReview).toEqual(
      dummyRateReviewResponse
    );

    const rateReviewAgainFail = await executeQuery(
      rateReview,
      {
        userid: rater,
        reviewid: createAppReview.data.writeReview.id,
        balance: 1
      },
      { models, user, SECRET, SECRETTWO, token }
    );

    await expect(rateReviewAgainFail.errors).toBeUndefined();
    await expect(rateReviewAgainFail.data.rateReview).toEqual(
      dummyRateReviewResponseFailure
    );

    const rateReviewAgain = await executeQuery(
      rateReview,
      {
        userid: rater,
        reviewid: createAppReview.data.writeReview.id,
        balance: 2
      },
      { models, user, SECRET, SECRETTWO, token }
    );

    await expect(rateReviewAgain.errors).toBeUndefined();
    await expect(rateReviewAgain.data.rateReview).toEqual(
      dummyRateReviewResponse
    );
  });
});
