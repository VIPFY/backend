/*
This file contains helper functions which will be used for testing as well
as a function which establishes and ends a connection to our database for testing.
*/

import { graphql } from "graphql";
import express from "express";
import { schema } from "../index";
import models from "../models/index";
import { SECRET, SECRETTWO } from "../login-data";

const app = express();

// Objects to inject into context to test whether an user is logged-in
export const user = {
  id: 7,
  email: expect.any(String)
};

export const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVuaXRpZCI6IjcifSwiaWF0IjoxNTI1Nzg5Mjk5LCJleHAiOjE1MjU4MzI0OTl9.ZV4iygY3_IR4ziBHI91bNHP1sWkFSCIhRkQkN14NaYk";

// Helper function to test Queries
export const executeQuery = (query, args = {}, context = {}) =>
  graphql(schema, query, {}, context, args);

// A function to test standard behaviour from queries
export function testDefault({ description, operation, dummy, name, arrayTest, args, errorTest }) {
  return test(description, async () => {
    expect.assertions(2);
    const result = await executeQuery(operation, args, {
      models,
      user,
      token,
      SECRET,
      SECRETTWO
    });
    const { data, errors } = result;

    if (errorTest) {
      await expect(errors).toBeDefined();
      await expect(data).toBe(null);
    } else {
      await expect(errors).toBeUndefined();
      if (arrayTest) {
        await expect(data[name]).toContainEqual(expect.objectContaining(dummy));
      } else {
        await expect(data[name]).toEqual(dummy);
      }
    }
  });
}

export function testAuthentication({ operation, name, args }) {
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
    models.sequelize.sync().then(() => app.listen(null));
  });
  afterAll(() => models.sequelize.close());
}
