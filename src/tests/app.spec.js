import models from "../models/index";
import { executeQuery } from "./helper";

const allApps = `
query {
  allApps {
    id
    name
    developerid
    description
    applogo
  }
}
`;

const dummy = {
  id: expect.any(Number),
  name: expect.any(String),
  developerid: expect.any(Number),
  description: expect.any(String),
  applogo: expect.stringMatching(/[\w]+\.[a-zA-z]{3,4}/)
};

describe("Query", () => {
  test("allApps should fetch all available Apps", async () => {
    const result = await executeQuery(allApps, {}, { models });
    const { data, errors } = result;

    expect(errors).toBeUndefined();
    expect(data.allApps).toContainEqual(expect.objectContaining(dummy));
  });
});
