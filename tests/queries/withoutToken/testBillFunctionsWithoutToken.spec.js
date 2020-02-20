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
  ['boughtPlans', ['', "{id}"]],
  ['fetchBills', ['', "{id}"]],
  ['fetchPaymentData', ['', "{id}"]],
  //['fetchPlans', ['(appid:123)', "{id}"]], //allows unauthorized access - OK
  ['fetchPlanInputs', ['(planid:1)', ""]],
  ['fetchBillingEmails', ['', "{email}"]],
  ['fetchCredits', ['',"{id}"]],
  ['fetchAllBoughtPlansFromCompany', ['(appid:123)', "{id}"]]
]);

describe("Testing bill queries without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }

  it("testing fetchPlans with unknown appid, expect NormalError", async () => {
    //appid = 1, unknown app, the test should fail if app with id 1 is created
    var query = "{fetchPlans(appid:1){name}}";
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.success).toEqual(false);
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
  });
});
