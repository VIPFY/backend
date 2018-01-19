import { executeQuery, testDefault } from "./helper";
import { dummyApp, dummyAppImage, dummyDeveloper } from "./dummies";
import {
  allApps,
  allAppImages,
  fetchApp,
  fetchAppImages,
  fetchDeveloper
} from "./queries";

const tests = [
  {
    description: "allApps should fetch all available Apps",
    operation: allApps,
    name: "allApps",
    dummy: dummyApp,
    arrayTest: true
  },
  {
    description: "allAppImages should return all Links to Images",
    operation: allAppImages,
    name: "allAppImages",
    dummy: dummyAppImage,
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
    description:
      "fetchAppImages should return all Links to Images associated with an App",
    operation: fetchAppImages,
    name: "fetchAppImages",
    dummy: dummyAppImage,
    args: {
      appid: 1
    },
    arrayTest: true
  },
  {
    description: "fetchDeveloper should return the developer with the given id",
    operation: fetchDeveloper,
    name: "fetchDeveloper",
    args: {
      developerid: 1
    },
    dummy: dummyDeveloper
  }
];

describe("Query", () => tests.map(test => testDefault(test)));
