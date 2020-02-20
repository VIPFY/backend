import { tester } from "graphql-tester";

const testing = tester({
  url: "https://api.dev.vipfy.store/graphql",
  method: "POST",
  contentType: "application/json"
});

const queryWrapper = function(query) {
  return '{"operationName":null,"variables":{},"query":"' + query + '"}';
};

const expectAuthError = function(response, queryName) {
  expect(response).toBeDefined();
  expect(response.success).toEqual(false);
  expect(response.status).toEqual(200);
  expect(response.errors).toHaveLength(1);
  expect(response.errors[0].name).toEqual("AuthError");

  if (response.data) {
    expect(response.data[queryName]).toEqual(null);
  } else expect(response.data).toEqual(null);
};
// prettier-ignore
var functionsWhichExpectAuthError = new Map([
  ['me', ['', "{id}"]],
  //['adminme', ['(unitid:1)', "{id}"]] // removed
  //NEW:
  ['fetchSemiPublicUser',['(userid:1211)', "{id}"]]
]);

describe("Testing auth queries without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `{${func}${parameters}${subfields}}`;
      //console.log(query);
      var response = await testing(queryWrapper(query));
      //console.log(response.data);
      expectAuthError(response, func);
    });
  }
  it("testing checkAuthToken with invalid token and email", async () => {
    var query =
      '{checkAuthToken(token: \\"invalidToken\\", email: \\"invalidEmail@mail.com\\"){ok}}';
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.success).toEqual(false);
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].message).toEqual("Invalid Token");
    expect(response.errors[0].name).toEqual("NormalError");
  });
});
