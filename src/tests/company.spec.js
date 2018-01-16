import models from "../models/index";
import { executeQuery } from "./helper";

const dummy = {
  id: expect.any(Number),
  name: expect.any(String)
};

const allCompanies = `
  query {
    allCompanies {
      name
      id
    }
  }
`;

describe("Query ", () => {
  test("allCompanies should fetch all companies", async () => {
    const result = await executeQuery(allCompanies, {}, { models });
    const { data, errors } = result;

    expect(errors).toBeUndefined();
    expect(data.allCompanies).toContainEqual(expect.objectContaining(dummy));
  });
});
