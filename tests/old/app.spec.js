import { company, lorem, internet } from "faker";
import {
  executeQuery,
  testDefault,
  testAuthentication,
  context,
  adminToken
} from "./helper";
import { dummyApp, dummyNewApp, dummyResponse } from "./dummies";
import { allApps, fetchAppById } from "./queries";
import { createApp, updateApp, toggleAppStatus, deleteApp } from "./mutations";

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
    },
    adminTest: true
  },
  {
    description: "updateApp should update the props of an app",
    operation: updateApp,
    name: "updateApp",
    dummy: dummyResponse,
    args: {
      appid: 6,
      app: {
        description: "Changed to test"
      }
    },
    adminTest: true
  },
  {
    description: "toggleAppStatus should de/activate an app",
    operation: toggleAppStatus,
    name: "toggleAppStatus",
    dummy: dummyResponse,
    args: {
      id: 6
    },
    adminTest: true
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

describe("This workflow", () => {
  test("should try to create an app and fail because of an already used name, same id for developer and support before it succeeds ", async () => {
    const app = {
      name: "Weebly",
      commission: { text: lorem.sentence() },
      teaserdescription: company.catchPhrase(),
      description: lorem.text(),
      developer: 21,
      supportunit: 15,
      website: internet.domainName()
    };

    const createAppFirstTry = await executeQuery(createApp, { app }, context);

    await expect(createAppFirstTry.errors).toBeDefined();
    await expect(createAppFirstTry.data).toBe(null);

    app.name = company.companyName();
    app.developer = 15;

    const createAppSecondTry = await executeQuery(createApp, { app }, context);

    await expect(createAppSecondTry.errors).toBeDefined();
    await expect(createAppSecondTry.data).toBe(null);

    app.developer = 21;

    const createAppThirdTry = await executeQuery(createApp, { app }, context);

    await expect(createAppThirdTry.errors).toBeUndefined();
    await expect(createAppThirdTry.data.createApp).toEqual(dummyResponse);
  });

  test("should create an app, update it, change it's status, delete it and fail to fetch it", async () => {
    const app = {
      name: company.companyName(),
      commission: {
        text: lorem.sentence()
      },
      teaserdescription: company.catchPhrase(),
      description: lorem.text(),
      developer: 21,
      supportunit: 15,
      website: internet.domainName()
    };

    context.token = adminToken;

    const newApp = await executeQuery(createApp, { app }, context);

    await expect(newApp.errors).toBeUndefined();
    await expect(newApp.data.createApp).toEqual(dummyResponse);
    const fetchedApp = await executeQuery(
      fetchApp,
      { name: app.name },
      context
    );
    const {
      data: {
        fetchApp: { id }
      }
    } = fetchedApp;

    const appUpdate = {
      description: lorem.text(),
      website: internet.domainName()
    };
    const updatedApp = await executeQuery(
      updateApp,
      { appid: id, app: appUpdate },
      context
    );

    await expect(updatedApp.errors).toBeUndefined();
    await expect(updatedApp.data.updateApp).toEqual(dummyResponse);

    const disabledApp = await executeQuery(toggleAppStatus, { id }, context);

    await expect(disabledApp.errors).toBeUndefined();
    await expect(disabledApp.data.toggleAppStatus).toEqual(dummyResponse);

    const deletedApp = await executeQuery(deleteApp, { id }, context);

    await expect(deletedApp.errors).toBeUndefined();
    await expect(deletedApp.data.deleteApp).toEqual(dummyResponse);

    const failedFetch = await executeQuery(fetchAppById, { id }, context);

    await expect(failedFetch.errors).toBeUndefined();
    await expect(failedFetch.data.fetchAppById).toBe(null);
  });
});
