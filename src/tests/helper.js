// This file contains the helper function which will be used for testing as
// well as various dummies to compare the output of the function

import { graphql } from "graphql";
import { schema } from "../index";
import models from "../models/index";
import { random } from "lodash";

// Object to inject into context to test whether an user is logged-in
export const user = {
  id: 1,
  email: expect.any(String)
};

// Helper function to test Queries
export const executeQuery = (query, args = {}, context = {}) => {
  return graphql(schema, query, {}, context, args);
};

// A function to test standard behaviour from queries
export function testDefault({
  description,
  operation,
  dummy,
  name,
  arrayTest,
  args
}) {
  return test(description, async () => {
    const result = await executeQuery(operation, args, { models, user });
    const { data, errors } = result;

    expect(errors).toBeUndefined();
    if (arrayTest) {
      expect(data[name]).toContainEqual(expect.objectContaining(dummy));
    } else {
      expect(data[name]).toEqual(dummy);
    }
  });
}

export function testAuthentication({ operation, name, args, arrayTest }) {
  return test(`${name} should throw an error when the user is not authenticated`, async () => {
    const result = await executeQuery(operation, args, { models });
    const { data, errors } = result;

    expect(errors).toEqual(expect.anything());
    if (data) {
      expect(data[name]).toBeNull();
    } else {
      expect(data).toBeNull();
    }
  });
}
