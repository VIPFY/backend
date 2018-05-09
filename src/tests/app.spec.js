import { testDefault, testAuthentication } from "./helper";
import { dummyApp, dummyNewApp, dummyResponse } from "./dummies";
import { allApps, fetchApp, fetchAppById } from "./queries";
import { createApp, updateApp, toggleAppStatus } from "./mutations";

/* eslint array-callback-return: "off" */

const testQueries = [
  {
    description: "allApps should fetch all available Apps",
    operation: allApps,
    name: "allApps",
    dummy: dummyApp,
    arrayTest: true
  },
  {
    description: "fetchApp should fetch an App when given a correct name",
    operation: fetchApp,
    name: "fetchApp",
    dummy: dummyApp,
    args: {
      name: "Weebly"
    }
  },
  {
    description: "fetchAppById should fetch an App when given an id",
    operation: fetchAppById,
    name: "fetchAppById",
    dummy: dummyApp,
    args: {
      id: 2
    }
  }
];

const testMutations = [
  {
    description: "createApp should create a new app",
    operation: createApp,
    name: "createApp",
    dummy: dummyResponse,
    args: {
      app: dummyNewApp
    }
  },
  {
    description: "updateApp should update the props of an app",
    operation: updateApp,
    name: "updateApp",
    dummy: dummyResponse,
    args: {
      id: 6,
      app: {
        description: "Changed to test"
      }
    }
  },
  {
    description: "toggleAppStatus should de/activate an app",
    operation: toggleAppStatus,
    name: "toggleAppStatus",
    dummy: dummyResponse,
    args: {
      id: 6
    }
  }
];

describe("Query", () => testQueries.map(test => testDefault(test)));
describe("Mutations", () => {
  const unnecessaryTests = [];
  testMutations.map(test => {
    testDefault(test);
    if (!unnecessaryTests.includes(test.name)) {
      testAuthentication(test);
    }
    unnecessaryTests.push(test.name);
  });
});
