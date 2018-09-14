import { internet, random } from "faker";
import { executeQuery, testDefault, testAuthentication, context, adminToken } from "./helper";
import {
  dummyResponse,
  dummyEmail,
  dummyRegisterResponse,
  dummySignInResponse,
  dummyForgotPwResponse
} from "./dummies";
import { me, admin } from "./queries";
import {
  signUp,
  signUpConfirm,
  signIn,
  forgotPassword,
  freezeAccount,
  adminUpdateUser,
  deleteUser
} from "./mutations";

/* eslint-disable array-callback-return, no-undef */
const signUpArgs = {
  email: "newtestuser@vipfy.com",
  newsletter: random.boolean()
};

const user = {
  id: 72,
  admin: expect.any(Boolean)
};

const testQueries = [
  {
    description: "me should return the logged-in user",
    operation: me,
    name: "me",
    dummy: user
  }
];

const testMutations = [
  {
    description: "signUp should enter an user into the database and return a token",
    operation: signUp,
    name: "signUp",
    dummy: dummyRegisterResponse,
    args: signUpArgs
  },
  {
    description: "signUp should throw an error if the email is already in the database",
    operation: signUp,
    name: "signUp",
    args: signUpArgs,
    errorTest: true
  },
  {
    description: "signUpConfirm should throw an error if the email is not in the database",
    operation: signUpConfirm,
    name: "signUpConfirm",
    args: {
      email: internet.email(),
      password: random.word()
    },
    errorTest: true
  },
  {
    description: "signUpConfirm should throw an error if the user is already verified",
    operation: signUpConfirm,
    name: "signUpConfirm",
    args: {
      email: dummyEmail,
      password: random.word()
    },
    errorTest: true
  },
  {
    description: "signIn should throw an error if the email is not in the database",
    operation: signIn,
    name: "signIn",
    args: { email: internet.email(), password: "te435adsst" },
    errorTest: true
  },
  {
    description: "signIn should throw an error if the password is incorrect",
    operation: signIn,
    name: "signIn",
    args: { email: dummyEmail, password: "2354234" },
    errorTest: true
  },
  {
    description: "forgotPassword should send the user a new signUp email",
    operation: forgotPassword,
    name: "forgotPassword",
    dummy: dummyForgotPwResponse,
    args: { email: dummyEmail }
  },
  {
    description: "forgotPassword should return an error if the email is not in the database",
    operation: forgotPassword,
    name: "forgotPassword",
    args: { email: internet.email() },
    errorTest: true
  },
  {
    description: "freezeAccount should throw an error if the user isn't in the database",
    operation: freezeAccount,
    name: "freezeAccount",
    args: { unitid: 123 },
    errorTest: true,
    adminTest: true
  }
];

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

describe("Mutation", () => {
  const unnecessaryTests = [];
  testMutations.map(test => {
    testDefault(test);
    if (!unnecessaryTests.includes(test.name) && test.adminTest) {
      testAuthentication(test);
    }
    unnecessaryTests.push(test.name);
  });
});

describe("This workflow", () => {
  test("should signUp an user, confirm him and then log him in", async () => {
    const email = internet.email();
    const password = random.word();

    const signUpUser = await executeQuery(signUp, { email }, context);

    await expect(signUpUser.errors).toBeUndefined();
    await expect(signUpUser.data.signUp).toEqual(dummyRegisterResponse);

    const confirmUser = await executeQuery(signUpConfirm, { email, password }, context);

    await expect(confirmUser.errors).toBeUndefined();
    await expect(confirmUser.data.signUpConfirm).toEqual(dummyRegisterResponse);

    const requestNewPassword = await executeQuery(signIn, { email, password }, context);

    await expect(requestNewPassword.errors).toBeUndefined();
    await expect(requestNewPassword.data.signIn).toEqual(dummySignInResponse);
  });

  test("should throw several errors because of bad user stati after an admin has updated it", async () => {
    const notAdmin = await executeQuery(admin, {}, context);

    await expect(notAdmin.errors).toEqual(expect.anything());
    await expect(notAdmin.data.admin).toBeNull();

    context.token = adminToken;
    const suspendUser = await executeQuery(freezeAccount, { unitid: 31 }, context);

    await expect(suspendUser.errors).toBeUndefined();
    await expect(suspendUser.data.freezeAccount).toEqual(dummyResponse);

    context.token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVuaXRpZCI6IjMxIn0sImlhdCI6MTUyNTk1OTI1MywiZXhwIjoxNTI2MDAyNDUzfQ.H5M0T1UuOk6aHrybDRqlo7uGI8DcbFckCXUvSoxw9gY";
    const suspendedError = await executeQuery(me, {}, context);

    await expect(suspendedError.errors).toEqual(expect.anything());
    await expect(suspendedError.data.me).toBeNull();

    context.token = adminToken;
    await executeQuery(freezeAccount, { unitid: 31 }, context);

    const banUser = await executeQuery(
      adminUpdateUser,
      { unitid: 31, userData: { banned: true } },
      context
    );

    await expect(banUser.errors).toBeUndefined();
    await expect(banUser.data.adminUpdateUser).toEqual(dummyResponse);

    context.token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVuaXRpZCI6IjMxIn0sImlhdCI6MTUyNTk1OTI1MywiZXhwIjoxNTI2MDAyNDUzfQ.H5M0T1UuOk6aHrybDRqlo7uGI8DcbFckCXUvSoxw9gY";
    const bannedError = await executeQuery(me, {}, context);

    await expect(bannedError.errors).toEqual(expect.anything());
    await expect(bannedError.data.me).toBeNull();

    context.token = adminToken;

    const deletedUser = await executeQuery(deleteUser, { unitid: 31 }, context);

    await expect(deletedUser.errors).toBeUndefined();
    await expect(deletedUser.data.deleteUser).toEqual(dummyResponse);

    context.token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVuaXRpZCI6IjMxIn0sImlhdCI6MTUyNTk1OTI1MywiZXhwIjoxNTI2MDAyNDUzfQ.H5M0T1UuOk6aHrybDRqlo7uGI8DcbFckCXUvSoxw9gY";
    const deletedError = await executeQuery(me, {}, context);

    await expect(deletedError.errors).toEqual(expect.anything());
    await expect(deletedError.data.me).toBeNull();
  });
});
