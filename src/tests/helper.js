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

// Objects to inject into context to test whether an user is logged-in
export const user = {
  id: 67,
  email: expect.any(String)
};

export const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjo2N30sImlhdCI6MTUxNzQ5Nzc5MSwiZXhwIjoxNTE3NTQwOTkxfQ.ys2oSIgznGLv8mOXtIdpdAP-mnVFPFFw4nzWq2n_g1w";

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
  args,
  errorTest
}) {
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
    testDatabase.sequelize.sync().then(() => app.listen(null));
  });
  afterAll(() => testDatabase.sequelize.close());
}
