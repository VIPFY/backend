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
  ['allApps', ['', "{id}"]],
  ['fetchAllAppsEnhanced', ['', "{id}"]],
  ['fetchAppById', ['(id:1)', "{name}"]],
  ['fetchLicences', ['', "{id}"]],
  ['fetchUsersOwnLicences', ['(unitid:1)', "{id}"]],
  ['fetchUserLicences', ['(unitid:1)', "{id}"]],
  ['fetchUnitApps', ['(departmentid:1)', "{id}"]],
  ['fetchUnitAppsSimpleStats', ['(departmentid:1)', "{id}"]],
  ['fetchSupportToken', ['', ""]],
  //['fetchAppIcon', ['(licenceid:1)', "{icon}"]], // removed
  //['fetchBoughtplanUsagePerUser', []] -> separate test
  //['fetchMonthlyAppUsage', ['', "{totalminutes}"]], // removed
  ['fetchTotalAppUsage', ['', "{totalminutes}"]],
  //NEW:
  ['fetchCompanyServices', ['', "{id}"]],
  ['fetchCompanyService', ['(serviceid:1)', "{id}"]],
  ['fetchServiceLicences', ['(employees:[1211], serviceid:1)', "{id}"]],
  ['fetchIssuedLicences', ['(unitid:1211)', "{id}"]],
  ['fetchTempLicences', ['(unitid:1211)', "{id}"]],
  ['bulkUpdateLayout', ['(layouts:[{id:1}])', ""]]
]);

describe("Testing app queries without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }

  it("testing fetchBoughtplanUsagePerUser, expect AuthError", async () => {
    var query =
      '{"operationName":"onFetchBoughtplanUsagePerUser","variables":{"starttime":"2018-12-3","endtime":"2019-12-3","boughtplanid":1},"query":"query onFetchBoughtplanUsagePerUser($starttime: Date!, $endtime: Date!, $boughtplanid: ID!) {  fetchBoughtplanUsagePerUser(starttime: $starttime, endtime: $endtime, boughtplanid: $boughtplanid) {    totalminutes  }}"}';
    var response = await testing(query);
    expectAuthError(response, "fetchBoughtplanUsagePerUser");
  });

  it("testing fetchBoughtplanUsagePerUser with random data, expect AuthError", async () => {
    var query =
      '{"operationName":"onFetchBoughtplanUsagePerUser","variables":{"starttime":"1533041430", "endtime":"1564577462","boughtplanid": "1"},"query":"query onFetchBoughtplanUsagePerUser($starttime: Date!,$endtime: Date!, $boughtplanid: ID!) {fetchBoughtplanUsagePerUser(starttime: $starttime, endtime: $endtime, boughtplanid: $boughtplanid){boughtplan{id} unit{id} totalminutes}}"}';
    var response = await testing(query);
    expectAuthError(response, "fetchBoughtplanUsagePerUser");
  });
});
