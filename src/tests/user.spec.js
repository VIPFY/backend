import models from "../models/index";
import {
  executeQuery,
  testDefault,
  testAuthentication,
  user,
  token
} from "./helper";
import {
  dummyEmail,
  dummyUser,
  dummyRegisterResponse,
  dummySignInResponse,
  dummyForgotPwResponse
} from "./dummies";
import { allUsers, me, fetchUser } from "./queries";
import { signUp, signUpConfirm, signIn, forgotPassword } from "./mutations";
import { internet, random } from "faker";
import { SECRET, SECRETTWO } from "../login-data";

const testQueries = [
  {
    description: "allUsers should fetch all users",
    operation: allUsers,
    name: "allUsers",
    dummy: dummyUser,
    arrayTest: true
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
    args: {
      email: "newtestuser@vipfy.com",
      newsletter: random.boolean()
    },
    errorTest: true
  },
  {
    description:
      "signUpConfirm should throw an error if the email is not in the database",
    operation: signUpConfirm,
    name: "signUpConfirm",
    args: {
      email: internet.email(),
      password: random.word()
    },
    errorTest: true
  },
  {
    description:
      "signUpConfirm should throw an error if the user is already verified",
    operation: signUpConfirm,
    name: "signUpConfirm",
    args: {
      email: "newtestuser@vipfy.com",
      password: random.word()
    },
    errorTest: true
  },
  {
    description:
      "signIn should return a token so that the user can be authenticated",
    operation: signIn,
    name: "signIn",
    dummy: dummySignInResponse,
    args: {
      email: "Beth_Kunde24@gmail.com",
      password: "test"
    }
  },
  {
    description:
      "signIn should throw an error if the email is not in the database",
    operation: signIn,
    name: "signIn",
    args: {
      email: "hellokittymegauser@doesnotexist.de",
      password: "test"
    },
    errorTest: true
  },
  {
    description: "signIn should throw an error if the password is incorrect",
    operation: signIn,
    name: "signIn",
    args: {
      email: dummyEmail,
      password: "2354234"
    },
    errorTest: true
  },
  {
    description: "forgotPassword should send the user a new signUp email",
    operation: forgotPassword,
    name: "forgotPassword",
    dummy: dummyForgotPwResponse,
    args: {
      email: dummyEmail
    }
  },
  {
    description:
      "forgotPassword should return an error if the email is not in the database",
    operation: forgotPassword,
    name: "forgotPassword",
    args: {
      email: internet.email()
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

  testAuthentication({ operation: me, name: "me" });

  test("me should return the logged-in user", async () => {
    const result = await executeQuery(me, {}, { models, user, token });
    const { data, errors } = result;

    await expect(errors).toBeUndefined();
    await expect(data.me).toEqual(user);
  });
});

describe("Mutation", () => {
  testMutations.map(test => {
    testDefault(test);
  });
});

describe("This workflow", () => {
  test("should signUp an user, confirm him and then log him in", async () => {
    const email = internet.email();
    const password = random.word();

    const signUpUser = await executeQuery(
      signUp,
      { email },
      { models, SECRET, SECRETTWO, token }
    );

    await expect(signUpUser.errors).toBeUndefined();
    await expect(signUpUser.data.signUp).toEqual(dummyRegisterResponse);

    const ConfirmUser = await executeQuery(
      signUpConfirm,
      { email, password },
      { models, SECRET, SECRETTWO, token }
    );

    await expect(ConfirmUser.errors).toBeUndefined();
    await expect(ConfirmUser.data.signUpConfirm).toEqual(dummyRegisterResponse);

    const requestNewPassword = await executeQuery(
      signIn,
      { email, password },
      { models, SECRET, SECRETTWO, token }
    );

    await expect(requestNewPassword.errors).toBeUndefined();
    await expect(requestNewPassword.data.signIn).toEqual(dummySignInResponse);
  });
});
