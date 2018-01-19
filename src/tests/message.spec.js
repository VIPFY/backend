import models from "../models/index";
import { executeQuery, user, testDefault, testAuthentication } from "./helper";
import { dummyMessage } from "./dummies";
import { fetchMessages } from "./queries";

const tests = [
  {
    description: "fetchMessages should fetch all messages for an user",
    operation: fetchMessages,
    name: "fetchMessages",
    dummy: dummyMessage,
    args: {
      id: 72
    },
    arrayTest: true
  }
];

describe("Query ", () => {
  tests.map(test => {
    testDefault(test);
    testAuthentication(test);
  });
});
