/*
This file contains helper functions which will be used for testing as well
as a function which establishes and ends a connection to our database for testing.
*/

import { graphql } from "graphql";
import { schema } from "../index";
import models from "../models/index";
import { random } from "lodash";
import { SECRET, SECRETTWO } from "../login-data";
import testDatabase from "../models/index";
import express from "express";

const app = express();

// Object to inject into context to test whether an user is logged-in
export const user = {
  id: random(1, 60),
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
    expect.assertions(2);
    const result = await executeQuery(operation, args, {
      models,
      user,
      SECRET,
      SECRETTWO
    });
    const { data, errors } = result;

    await expect(errors).toBeUndefined();
    if (arrayTest) {
      await expect(data[name]).toContainEqual(expect.objectContaining(dummy));
    } else {
      await expect(data[name]).toEqual(dummy);
    }
  });
}

export function testAuthentication({ operation, name, args, arrayTest }) {
  return test(`${name} should throw an error if the user is not authenticated`, async () => {
    expect.assertions(2);
    const result = await executeQuery(operation, args, { models });
    const { data, errors } = result;

    await expect(errors).toEqual(expect.anything());
    if (data) {
      await expect(data[name]).toBeNull();
    } else {
      await expect(data).toBeNull();
    }
  });
}

export function handleTestDatabase() {
  beforeAll(() => {
    testDatabase.sequelize.sync().then(() => app.listen(0));
  });
  afterAll(() => testDatabase.sequelize.close());
}
