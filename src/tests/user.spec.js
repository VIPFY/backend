import models from "../models/index";
import { executeQuery, testDefault, testAuthentication, user } from "./helper";
import { dummyUser } from "./dummies";
import { allUsers, me, fetchUser } from "./queries";

const tests = [
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

describe("Query ", () => {
  tests.map(test => {
    testDefault(test);
    testAuthentication(test);
  });

  testAuthentication({ operation: me, name: "me" });

  test("me should return the logged-in user", async () => {
    const result = await executeQuery(me, {}, { models, user });
    const { data, errors } = result;

    expect(errors).toBeUndefined();
    expect(data.me).toEqual(user);
  });
});
