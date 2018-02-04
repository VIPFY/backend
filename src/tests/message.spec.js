import models from "../models/index";
import { executeQuery, testDefault, testAuthentication, token } from "./helper";
import {
  dummyMessage,
  dummyResponse,
  dummyMessageResponseSuccess
} from "./dummies";
import { fetchMessages } from "./queries";
import { sendMessage, setDeleteStatus, setReadtime } from "./mutations";
import { lorem } from "faker";
import { random } from "lodash";
import { SECRET, SECRETTWO } from "../login-data";

const testQueries = [
  {
    description: "fetchMessages should fetch all messages for an user",
    operation: fetchMessages,
    name: "fetchMessages",
    dummy: dummyMessage,
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
      touser: random(31, 70),
      message: lorem.sentence()
    }
  },
  {
    description:
      "sendMessage should throw an error if sender and receiver have the same id",
    operation: sendMessage,
    name: "sendMessage",
    args: {
      touser: 67,
      message: lorem.sentence()
    },
    errorTest: true
  },
  {
    description:
      "sendMessage should throw an error if the receiver doesn't exist",
    operation: sendMessage,
    name: "sendMessage",
    args: {
      touser: 99999,
      message: lorem.sentence()
    },
    errorTest: true
  },
  {
    description: "sendMessage should throw an error if the message is empty",
    operation: sendMessage,
    name: "sendMessage",
    args: {
      touser: random(0, 66),
      message: ""
    },
    errorTest: true
  },
  {
    description:
      "setDeleteStatus should throw an error if the message doesn't exist",
    operation: setDeleteStatus,
    name: "setDeleteStatus",
    args: {
      id: 99999,
      model: "Notification",
      type: "deleted"
    },
    errorTest: true
  },
  {
    description:
      "setReadtime should throw an error, if the message was already read",
    operation: setReadtime,
    name: "setReadtime",
    args: {
      id: 6,
      model: "Notification"
    },
    errorTest: true
  }
];

describe("Query", () => {
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

describe("Mutation", () => {
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

describe("This workflow", () => {
  test("should send a message from user to user, read it and delete it.", async () => {
    const receiver = random(1, 65);
    const message = lorem.sentence();
    const model = "Notification";

    const sendTheMessage = await executeQuery(
      sendMessage,
      {
        touser: receiver,
        message
      },
      { models, SECRET, SECRETTWO, token }
    );

    await expect(sendTheMessage.errors).toBeUndefined();
    await expect(sendTheMessage.data.sendMessage).toEqual(
      dummyMessageResponseSuccess
    );

    const readTheMessage = await executeQuery(
      setReadtime,
      {
        id: sendTheMessage.data.sendMessage.id,
        model
      },
      { models, SECRET, SECRETTWO, token }
    );

    await expect(readTheMessage.errors).toBeUndefined();
    await expect(readTheMessage.data.setReadtime).toEqual(
      dummyMessageResponseSuccess
    );

    const deleteTheMessage = await executeQuery(
      setDeleteStatus,
      {
        id: sendTheMessage.data.sendMessage.id,
        model,
        type: "deleted"
      },
      { models, SECRET, SECRETTWO, token }
    );

    await expect(deleteTheMessage.errors).toBeUndefined();
    await expect(deleteTheMessage.data.setDeleteStatus).toEqual(dummyResponse);
  });
});
