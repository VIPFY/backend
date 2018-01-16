import models from "../models/index";
import { executeQuery, user } from "./helper";

const dummy = {
  email: expect.any(String)
};

const allUsers = `
  query {
    allUsers {
      id
      email
      userstatus
    }
  }
`;

describe("Query ", () => {
  test("allUsers should fetch all users", async () => {
    const result = await executeQuery(allUsers, {}, { models, user });
    const { data, errors } = result;

    expect(errors).toBeUndefined();
    expect(data.allUsers).toContainEqual(expect.objectContaining(dummy));
  });

  test("allUsers should throw an error when the user is not authenticated", async () => {
    const result = await executeQuery(allUsers, {}, { models });
    const { data, errors } = result;

    expect(errors).toEqual(expect.anything());
    expect(data).toBeNull();
  });
});
