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
var functionsWhichExpectAuthError = new Map([
  ["distributeLicenceToDepartment", ['(departmentid:1, boughtplanid:1, licencetype:\\"Licence\\")', "{ok}"]],
  ["revokeLicencesFromDepartment", ['(departmentid:1, boughtplanid: 1)', "{ok}"]],
  ["distributeLicence", ['(licenceid:1, unitid:1, departmentid: 1)', "{ok}"]],
  ["revokeLicence", ['(licenceid:1)', "{ok}"]],
  ["agreeToLicence", ['(licenceid:1)', "{ok}"]],
  ["trackMinutesSpent", ['(licenceid:1, minutes:10)', "{ok}"]],
  ["addExternalBoughtPlan", ['(appid:1)', "{id}"]],
  ["addExternalLicence", ['(username: \\"someone\\", password: \\"something\\", appid: 1, boughtplanid: 1)', "{ok}"]],
  ["suspendLicence", ['(licenceid:1)', "{ok}"]],
  ["clearLicence", ['(licenceid:1)', "{ok}"]],
  //["deleteLicenceAt", ['', ""]], special mutation with Date variables -> separate test
  //["deleteBoughtPlanAt", ['', ""]], special mutation with Date variables -> separate test
  ["voteForApp", ['(app:\\"TestApp\\")', "{ok}"]],
  ["updateCredentials", ['(licenceid:1)', ""]],
  ["updateLayout", ['(layouts:{id:1})', ""]],
  //["createOwnApp", ['', ""]] Upload parameter?
]);

describe("Testing app mutations without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `mutation{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }

  it("testing deleteLicenceAt with random licenceid and date, expect AuthError", async () => {
    var query =
      '{"operationName":"onDeleteLicenceAt","variables":{"licenceid":"1","time":"20019-12-03T10:15:30Z"},"query":"mutation onDeleteLicenceAt($licenceid: ID!, $time: Date!) {deleteLicenceAt(licenceid: $licenceid, time: $time)}"}';
    var response = await testing(query);
    expectAuthError(response, "deleteLicenceAt");
  });

  it("testing deleteBoughtPlan with random licenceid and date, expect AuthError", async () => {
    var query =
      '{"operationName":"onDeleteBoughtPlanAt","variables":{"boughtplanid":"1","time":"20019-12-03T10:15:30Z"},"query":"mutation onDeleteBoughtPlanAt($boughtplanid: ID!, $time: Date!) {deleteBoughtPlanAt(boughtplanid: $boughtplanid, time: $time)}"}';
    var response = await testing(query);
    expectAuthError(response, "deleteBoughtPlan");
  });
});
