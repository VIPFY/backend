import models from "../models/index";
import { executeQuery, testDefault, testAuthentication, user } from "./helper";
import {
  dummyUser,
  dummyRegisterResponse,
  dummyRegisterResponseFailure,
  dummySigninResponse
} from "./dummies";
import { allUsers, me, fetchUser } from "./queries";
import { signUp, signUpConfirm, signIn } from "./mutations";
import { internet, random } from "faker";

const testQueries = [
  {
    description: "allUsers should fetch all users",
    operation: allUsers,
    name: "allUsers",
    dummy: dummyUser,
    arrayTest: true
  },
  {
    description: "fetchUser should return the user with the given id",
    operation: fetchUser,
    name: "fetchUser",
    dummy: user,
    args: {
      id: user.id
    }
  }
];

const testMutations = [
  {
    description:
      "signUp should enter an user into the database and return a token",
    operation: signUp,
    name: "signUp",
    dummy: dummyRegisterResponse,
    args: {
      email: internet.email(),
      newsletter: random.boolean()
    }
  },
  {
    description:
      "signUp should throw an error if the email is already in the database",
    operation: signUp,
    name: "signUp",
    dummy: dummyRegisterResponseFailure,
    args: {
      email: "newtestuser@vipfy.com",
      newsletter: random.boolean()
    }
  },
  {
    description:
      "signUpConfirm should throw an error if the email is not in the database",
    operation: signUpConfirm,
    name: "signUpConfirm",
    dummy: dummyRegisterResponseFailure,
    args: {
      email: internet.email(),
      password: random.word()
    }
  },
  {
    description:
      "signUpConfirm should throw an error if the user is already verified",
    operation: signUpConfirm,
    name: "signUpConfirm",
    dummy: dummyRegisterResponseFailure,
    args: {
      email: "newtestuser@vipfy.com",
      password: random.word()
    }
  },
  {
    description:
      "signIn should return a token so that the user can be authenticated",
    operation: signIn,
    name: "signIn",
    dummy: dummySigninResponse,
    args: {
      email: "testuser@vipfy.com",
      password: "test"
    }
  },
  {
    description:
      "signIn should throw an error if the email is not in the database",
    operation: signIn,
    name: "signIn",
    dummy: dummyRegisterResponseFailure,
    args: {
      email: internet.email(),
      password: "test"
    }
  },
  {
    description: "signIn should throw an error if the password is incorrect",
    operation: signIn,
    name: "signIn",
    dummy: dummyRegisterResponseFailure,
    args: {
      email: "testuser@vipfy.com",
      password: "2354234"
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

  testAuthentication({ operation: me, name: "me" });

  test("me should return the logged-in user", async () => {
    const result = await executeQuery(me, {}, { models, user });
    const { data, errors } = result;

    expect(errors).toBeUndefined();
    expect(data.me).toEqual(user);
  });
});

describe("Mutation ", () => {
  testMutations.map(test => {
    testDefault(test);
  });
});
