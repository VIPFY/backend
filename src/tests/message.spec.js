import models from "../models/index";
import { executeQuery, user } from "./helper";

const dummy = {
  id: expect.any(Number),
  type: expect.any(Number),
  sendtime: expect.any(Number),
  message: expect.any(String)
};

const fetchMessages = `
  query FetchMessages($id: Int!){
    fetchMessages(id: $id) {
      id
      type
      sendtime
      message
    }
  }
`;

describe("Query ", () => {
  test("fetchMessages should fetch all messages for an user", async () => {
    const result = await executeQuery(
      fetchMessages,
      { id: 72 },
      { models, user }
    );
    const { data, errors } = result;

    expect(errors).toBeUndefined();
    expect(data.fetchMessages).toContainEqual(expect.objectContaining(dummy));
  });

  test("fetchMessages should throw an error when the user is not authenticated", async () => {
    const result = await executeQuery(fetchMessages, { id: 69 }, { models });
    const { data, errors } = result;

    expect(errors).toEqual(expect.anything());
    expect(data.fetchMessages).toBeNull();
  });
});
