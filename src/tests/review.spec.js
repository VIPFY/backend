import models from "../models/index";
import { executeQuery } from "./helper";

const dummy = {
  appid: expect.any(Number)
};

const allReviews = `
  query {
    allReviews {
      appid
    }
  }
`;

describe("Query ", () => {
  test("allReviews should fetch all Reviews", async () => {
    const result = await executeQuery(allReviews, {}, { models });
    const { data, errors } = result;

    expect(errors).toBeUndefined();
    expect(data.allReviews).toContainEqual(expect.objectContaining(dummy));
  });
});
