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
var functions = new Map([
  ['adminFetchAllApps', ['(limit:10, offset: 0, sortOptions: {name: \\"Name\\", order: ASC})',"{name}"]],
  //['adminFetchListLength', ["", "{allApps}"]], // removed
  ['admin', ["", "{id}"]],
  //['listStripeInvoices', ["", ""]], // removed
  //['adminFetchBoughtPlans', ['(company: 1, user: 1)', "{id}"]], // removed
  //['adminFetchLicences', ['(id: 1)', "{id}"]], // removed
  //['adminFetchLicence', ['(licenceid:1)', "{id}"]], // removed
  //['adminFetchUserAddresses', ['', "{address}"]], // removed
  ['adminFetchAppById', ['(id:1)', "{name}"]],
  ['allUsers', ['', '{id}']],
  //['fetchUser', ['(id:1)', "{firstname}"]], // removed
  ['allCompanies', ['', "{unitid{id}}"]],
  //['allDepartments', ['', "{unitid{id}}"]], // removed
  //['fetchRecentLogs', ['(user:1)', "{id}"]], // removed
  //['adminFetchPlans',['(appid:1)', "{id}"]], // removed
  //['adminFetchPlan', ['(planid:1)', "{name}"]], // removed
  //['adminFetchEmployees', ['(unitid:1)', "{id{name}}"]], // removed
  //['freeUsers', ['', "{id}"]], // removed
  //['adminFetchDepartments', ['(company:1)', "{id}"]], // removed
  //['adminFetchCompany', ['(id:1)', "{name}"]], // removed
  ['fetchServerStats', ['', "{data}"]]
]);

describe("Testing admin queries without token", () => {
  for (let [func, [parameters, subfields]] of functions) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `{${func}${parameters}${subfields}}`
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }
});
