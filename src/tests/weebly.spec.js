/*
This file tests specific calls to Weebly's API as well as our Graphql Mutation.
The mutation consists of three consequtive tests, which will be tested seperatly
as well as successively.
*/
import {
  executeQuery,
  user,
  testDefault,
  testAuthentication,
  testAgb
} from "./helper";
import { dummyWeeblyResponse, dummyWeeblyResponseFailure } from "./dummies";
import weeblyApi from "../services/weebly";
import { weeblyCreateLoginLink } from "./mutations";
import { internet } from "faker";
import models from "../models/index";

// Default timeout is 5s, this is not enough for the mutation weeblyCreateLoginLink
jest.setTimeout(10000);

const email = internet.email();
const domain = internet.domainName();

const tests = [
  {
    description: "should create a new user at Weebly",
    endpoint: "user",
    res: {
      user: {
        user_id: expect.any(String),
        language: "en",
        test_mode: true,
        email
      }
    },
    args: {
      language: "en",
      test_mode: true,
      email
    }
  },
  {
    description: "should create a new site at Weebly",
    endpoint: "user/117433630/site",
    res: {
      site: {
        site_id: expect.any(String),
        domain,
        allow_ssl: false
      }
    },
    args: {
      domain
    }
  },
  {
    description: "should return a link for login at Weebly",
    endpoint: "user/117433630/site/955438072903778533/loginLink",
    res: {
      link: expect.any(String)
    },
    args: ""
  }
];

const testWeeblyMutation = {
  description:
    "weeblyCreateLoginLink should create a new Weebly user, a site for him, and return a loginLink",
  operation: weeblyCreateLoginLink,
  name: "weeblyCreateLoginLink",
  dummy: dummyWeeblyResponse,
  args: {
    email: internet.email(),
    domain: internet.domainName(),
    plan: 1,
    agb: true
  }
};

const testAgbFalse = {
  description:
    "weeblyCreateLoginLink should create a new Weebly user, a site for him, and return a loginLink",
  operation: weeblyCreateLoginLink,
  name: "weeblyCreateLoginLink",
  dummy: dummyWeeblyResponseFailure,
  args: {
    email: internet.email(),
    domain: internet.domainName(),
    plan: 1,
    agb: false
  }
};

function testWeeblyApi({ endpoint, args, res, description }) {
  return test(description, async () => {
    expect.assertions(2);
    const result = await weeblyApi("POST", endpoint, args);

    await expect(result.Error).toBeUndefined();
    await expect(result).toMatchObject(res);
  });
}

describe("This command ", () => {
  tests.map(test => testWeeblyApi(test));
});

describe("Mutation ", () => {
  testDefault(testWeeblyMutation);
  testAuthentication(testWeeblyMutation);
  testAgb(testAgbFalse);
});
