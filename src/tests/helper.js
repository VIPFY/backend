/*
This file contains helper functions which will be used for testing as well
as a function which establishes and ends a connection to our database for testing.
*/

import { graphql } from "graphql";
import express from "express";
import models from "@vipfy-private/sequelize-setup";
import { schema } from "../index";

const { SECRET, SECRET_TWO } = process.env;

const app = express();

export const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVuaXRpZCI6IjcyIn0sImlhdCI6MTUyNTk1MzU1NCwiZXhwIjoxNTI1OTk2NzU0fQ.gU62PA7OhJfh3TTzxpmoVo9DMrRFROnHrDCQQb_MlqQ";

export const adminToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVuaXRpZCI6IjcifSwiaWF0IjoxNTI1Nzg5Mjk5LCJleHAiOjE1MjU4MzI0OTl9.ZV4iygY3_IR4ziBHI91bNHP1sWkFSCIhRkQkN14NaYk";

export const context = {
  SECRET,
  SECRET_TWO,
  token,
  models
};

// Helper function to test Queries
export const executeQuery = (query, args = {}, ct = {}) => graphql(schema, query, {}, ct, args);

// A function to test standard behaviour from queries
export function testDefault({
  description,
  operation,
  dummy,
  name,
  args,
  arrayTest,
  errorTest,
  adminTest
}) {
  return test(description, async () => {
    if (adminTest == true) {
      context.token = adminToken;
    }
    expect.assertions(2);
    const result = await executeQuery(operation, args, context);
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

export function testAuthentication({ operation, name, args, adminTest }) {
  return test(`${name} should throw an error if the user is not authenticated`, async () => {
    expect.assertions(2);
    const result = await executeQuery(operation, args, {
      models,
      token: adminTest ? token : null
    });
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
