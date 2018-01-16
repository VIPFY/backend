import { graphql } from "graphql";
import { schema } from "../index";

// Helper function to test Queries
export const executeQuery = (query, args = {}, context = {}) => {
  return graphql(schema, query, {}, context, args);
};

export const user = {
  id: 69
};

