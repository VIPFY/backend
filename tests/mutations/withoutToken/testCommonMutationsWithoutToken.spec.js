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
  // ["checkEmail", ['', ""]], -> separate test for both used and unused emails 
  ["readNotification", ['(id:2)', ""]],
  ["readAllNotifications", ['', ""]],
  // ["ping", ['', ""]], -> test?
  // ["checkVat", ['', ""]], TODO
  ["logSSOError", ['', ""]]
]);

describe("Testing common mutations without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `mutation{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }

  it("testing checkEmail with already used email, expect NormalError (email used)", async () => {
    var query = `mutation{checkEmail(email:\\"testmail147@abv.bg\\"){ok}}`;
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(false);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
  });

  it("testing checkEmail with unused email, expect success", async () => {
    var query = `mutation{checkEmail(email:\\"superrandomnameforeemail@randomdomainforemail.nonexistingtld\\"){ok}}`;
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(true);
    expect(response.errors).not.toBeDefined();
    expect(response.data.checkEmail.ok).toEqual(true);
  });
});
