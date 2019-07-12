import { tester } from "graphql-tester";

const testing = tester({
  url: "http://backend-dev2.eu-central-1.elasticbeanstalk.com/graphql",
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
  ['adminFetchListLength', ["", "{allApps}"]],
  ['admin', ["", "{id}"]],
  ['listStripeInvoices', ["", ""]],
  ['adminFetchBoughtPlans', ['(company: 1, user: 1)', "{id}"]],
  ['adminFetchLicences', ['(id: 1)', "{id}"]],
  ['adminFetchLicence', ['(licenceid:1)', "{id}"]],
  ['adminFetchUserAddresses', ['', "{address}"]],
  ['adminFetchAppById', ['(id:1)', "{name}"]],
  ['allUsers', ['', '{id}']],
  ['fetchUser', ['(id:1)', "{firstname}"]],
  ['allCompanies', ['', "{unitid{id}}"]],
  ['allDepartments', ['', "{unitid{id}}"]],
  ['fetchRecentLogs', ['(user:1)', "{id}"]],
  ['adminFetchPlans',['(appid:1)', "{id}"]],
  ['adminFetchPlan', ['(planid:1)', "{name}"]],
  ['adminFetchEmployees', ['(unitid:1)', "{id{name}}"]],
  ['freeUsers', ['', "{id}"]],
  ['adminFetchDepartments', ['(company:1)', "{id}"]],
  ['adminFetchCompany', ['(id:1)', "{name}"]],
  ['fetchServerStats', ['', "{data}"]]
]);

describe("Testing admin queries without token", () => {
  for (let [func, [parameters, subfields]] of functions) {
    it("testing " + func + ", expect AuthError", async () => {
      // prettier-ignore
      //var query = `{ ${func} ${parameters == "" ? "" : `(${parameters})`} ${subfields == "" ? "" : `{ ${subfields} }`} }`;
      var query = `{${func}${parameters}${subfields}}`
      //console.log(query);
      var response = await testing(queryWrapper(query));
      //console.log(response.data);
      expectAuthError(response, func);
    });
  }
});
