import { internet, random } from "faker";
import { executeQuery, testDefault, testAuthentication, context } from "./helper";
import {
  dummyEmail,
  dummyUser,
  dummyRegisterResponse,
  dummySignInResponse,
  dummyForgotPwResponse
} from "./dummies";
import { allUsers } from "./queries";
import { forgotPassword } from "./mutations";

/* eslint-disable array-callback-return, no-undef */

const testQueries = [
  {
    description: "allUsers should fetch all users",
    operation: allUsers,
    name: "allUsers",
    dummy: dummyUser,
    arrayTest: true
  }
];

const testMutations = [];

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

// describe("Mutation", () => {
//   testMutations.map(test => {
//     testDefault(test);
//   });
// });

// describe("This workflow", () => {
//   test("should signUp an user, confirm him and then log him in", async () => {
//   });
// });
