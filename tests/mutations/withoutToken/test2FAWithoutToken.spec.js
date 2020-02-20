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
  ["verify2FA", ['(userid: 1211, type: yubikey, code:\\"codeString\\", codeId: 1)', ""]],
  ['force2FA', ['(userid:1211)', ""]]
  //generateSecret -> separate test
]);

describe("Testing admin mutations without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `mutation{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }

  it("testing generateSecret, expect AuthError", async () => {
    var query = `{generateSecret(type:yubikey, userid:1211){qrCode}}`;
    var response = await testing(queryWrapper(query));
    expectAuthError(response, "generateSecret");
  });

  it("testing generateSecret, expect AuthError", async () => {
    var query = `{generateSecret(type:yubikey, userid:1211){qrCode}}`;
    var response = await testing(queryWrapper(query));
    expectAuthError(response, "generateSecret");
  });

  it("testing validate2FA with invalid data, expect NormalError", async () => {
    var query = `mutation{validate2FA(userid: 1211, type: yubikey, token: \\"invalidToken\\", twoFAToken: \\"invalid2FAToken\\")}`;
    var response = await testing(queryWrapper(query));

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(false);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
    expect(response.data).toEqual(null);
  });
});
