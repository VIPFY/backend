import { tester } from "graphql-tester";

const testing = tester({
  url: "http://backend-dev3.eu-central-1.elasticbeanstalk.com/graphql",
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
  //['allApps', ['', "{id}"]], //can unauthorized user see the available apps? -> Yes => Don't expect error 
  ['fetchAllAppsEnhanced', ['', "{id}"]],
  ['fetchAppById', ['(id:1)', "{name}"]],
  ['fetchLicences', ['', "{id}"]],
  ['fetchUsersOwnLicences', ['(unitid:1)', "{id}"]],
  ['fetchUserLicences', ['(unitid:1)', "{id}"]],
  ['fetchUnitApps', ['(departmentid:1)', "{id}"]],
  ['fetchUnitAppsSimpleStats', ['(departmentid:1)', "{id}"]],
  ['fetchSupportToken', ['', ""]],
  //['fetchAppIcon', ['(licenceid:1)', "{icon}"]],
  //['fetchBoughtplanUsagePerUser', []]
  ['fetchMonthlyAppUsage', ['', "{totalminutes}"]],
  ['fetchTotalAppUsage', ['', "{totalminutes}"]]
]);

describe("Testing app queries without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `{${func}${parameters}${subfields}}`;
      //console.log(query);
      var response = await testing(queryWrapper(query));
      //console.log(response.data);
      expectAuthError(response, func);
    });
  }

  it("testing fetchBoughtplanUsagePerUser, expect AuthError", async () => {
    var query =
      '{"operationName":"onFetchBoughtplanUsagePerUser","variables":{"starttime":"2018-12-3","endtime":"2019-12-3","boughtplanid":1},"query":"query onFetchBoughtplanUsagePerUser($starttime: Date!, $endtime: Date!, $boughtplanid: ID!) {  fetchBoughtplanUsagePerUser(starttime: $starttime, endtime: $endtime, boughtplanid: $boughtplanid) {    totalminutes  }}"}';
    var response = await testing(query);
    expectAuthError(response, "fetchBoughtplanUsagePerUser");
  });

  it("testing allApps, expect success and ids of apps", async () => {
    var query = "{allApps{id}}";
    var response = await testing(queryWrapper(query));
    expect(response.success).toEqual(true);
    //TODO: Complete the expected results!
  });
});
