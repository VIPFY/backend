import models from "../models/index";
import { user, testDefault, testAuthentication } from "./helper";
import {
  dummyMessage,
  dummyMessageResponseSuccess,
  dummyMessageResponseFailure
} from "./dummies";
import { fetchMessages } from "./queries";
import { sendMessage } from "./mutations";
import { lorem } from "faker";
import { random } from "lodash";

const testQueries = [
  {
    description: "fetchMessages should fetch all messages for an user",
    operation: fetchMessages,
    name: "fetchMessages",
    dummy: dummyMessage,
    args: {
      id: 2
    },
    arrayTest: true
  }
];

const testMutations = [
  {
    description: "sendMessage should send a direct message to another user",
    operation: sendMessage,
    name: "sendMessage",
    dummy: dummyMessageResponseSuccess,
    args: {
      fromuser: random(1, 30),
      touser: random(1, 30),
      message: lorem.sentence()
    }
  },
  {
    description:
      "sendMessage should throw an error if sender and receiver have the same id",
    operation: sendMessage,
    name: "sendMessage",
    dummy: dummyMessageResponseFailure,
    args: {
      fromuser: 1,
      touser: 1,
      message: lorem.sentence()
    }
  },
  {
    description:
      "sendMessage should throw an error if the receiver doesn't exist",
    operation: sendMessage,
    name: "sendMessage",
    dummy: dummyMessageResponseFailure,
    args: {
      fromuser: 1,
      touser: 99999,
      message: lorem.sentence()
    }
  },
  {
    description: "sendMessage should throw an error if the message is empty",
    operation: sendMessage,
    name: "sendMessage",
    dummy: dummyMessageResponseFailure,
    args: {
      fromuser: random(0, 16),
      touser: random(0, 16),
      message: ""
    }
  }
];

describe("Query ", () => {
  const unnecessaryTests = [];
  testQueries.map(test => {
    testDefault(test);
    if (unnecessaryTests.includes(test.name)) {
    } else {
      testAuthentication(test);
    }
    unnecessaryTests.push(test.name);
  });
});

describe("Mutation ", () => {
  const unnecessaryTests = [];
  testMutations.map(test => {
    testDefault(test);
    if (unnecessaryTests.includes(test.name)) {
    } else {
      testAuthentication(test);
    }
    unnecessaryTests.push(test.name);
  });
});
