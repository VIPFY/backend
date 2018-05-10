import { lorem } from "faker";
import { executeQuery, testDefault, testAuthentication, context } from "./helper";
import {
  dummyReadMessage,
  dummyUnreadMessage,
  dummySetReadtimeResponse,
  dummyResponse,
  dummyMessageResponseSuccess
} from "./dummies";
import { fetchMessages } from "./queries";
import { sendMessage, setDeleteStatus, setReadtime } from "./mutations";

/* eslint-disable array-callback-return */

const testQueries = [
  {
    description: "fetchMessages should fetch all messages for an user",
    operation: fetchMessages,
    name: "fetchMessages",
    dummy: dummyUnreadMessage,
    arrayTest: true
  },
  {
    description: "fetchMessages should fetch all read messages for an user",
    operation: fetchMessages,
    name: "fetchMessages",
    dummy: dummyReadMessage,
    args: {
      read: true
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
      touser: 7,
      message: lorem.sentence()
    }
  },
  {
    description: "sendMessage should throw an error if sender and receiver have the same id",
    operation: sendMessage,
    name: "sendMessage",
    args: {
      touser: 72,
      message: lorem.sentence()
    },
    errorTest: true
  },
  {
    description: "sendMessage should throw an error if the receiver doesn't exist",
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
      touser: 22,
      message: ""
    },
    errorTest: true
  },
  {
    description: "setDeleteStatus should throw an error if the message doesn't exist",
    operation: setDeleteStatus,
    name: "setDeleteStatus",
    args: {
      id: 99999,
      type: "archivetimesender"
    },
    errorTest: true
  },
  {
    description: "setReadtime should change the readtime prop",
    operation: setReadtime,
    dummy: dummySetReadtimeResponse,
    name: "setReadtime",
    args: {
      id: 16
    }
  },
  {
    description: "setReadtime should throw an error, if the message was already read",
    operation: setReadtime,
    name: "setReadtime",
    args: {
      id: 7
    },
    errorTest: true
  }
];

describe("Mutation", () => {
  const unnecessaryTests = [];
  testMutations.map(test => {
    testDefault(test);
    if (!unnecessaryTests.includes(test.name)) {
      testAuthentication(test);
    }
    unnecessaryTests.push(test.name);
  });
});

describe("Query", () => {
  const unnecessaryTests = [];
  testQueries.map(test => {
    testDefault(test);
    if (!unnecessaryTests.includes(test.name)) {
      testAuthentication(test);
    }
    unnecessaryTests.push(test.name);
  });
});

describe("This workflow", () => {
  test("should send a message from user to user, read it and delete it.", async () => {
    const receiver = 22;
    const message = lorem.sentence();

    const sendTheMessage = await executeQuery(
      sendMessage,
      {
        touser: receiver,
        message
      },
      context
    );

    await expect(sendTheMessage.errors).toBeUndefined();
    await expect(sendTheMessage.data.sendMessage).toEqual(dummyMessageResponseSuccess);

    const readTheMessage = await executeQuery(
      setReadtime,
      { id: sendTheMessage.data.sendMessage.id },
      context
    );

    await expect(readTheMessage.errors).toBeUndefined();
    await expect(readTheMessage.data.setReadtime).toEqual(dummyMessageResponseSuccess);

    const deleteTheMessage = await executeQuery(
      setDeleteStatus,
      {
        id: sendTheMessage.data.sendMessage.id,
        type: "archivetimesender"
      },
      context
    );

    await expect(deleteTheMessage.errors).toBeUndefined();
    await expect(deleteTheMessage.data.setDeleteStatus).toEqual(dummyResponse);
  });
});
