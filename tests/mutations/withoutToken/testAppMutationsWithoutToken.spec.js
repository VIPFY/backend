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
  //["distributeLicenceToDepartment", ['(departmentid:1, boughtplanid:1, licencetype:\\"Licence\\")', "{ok}"]], // removed
  //["revokeLicencesFromDepartment", ['(departmentid:1, boughtplanid: 1)', "{ok}"]], // removed
  ["distributeLicence", ['(licenceid:1, unitid:1, departmentid: 1)', "{ok}"]],
  //["revokeLicence", ['(licenceid:1)', "{ok}"]], // removed
  ["agreeToLicence", ['(licenceid:1)', "{ok}"]],
  ["trackMinutesSpent", ['(licenceid:1, minutes:10)', "{ok}"]],
  ["addExternalBoughtPlan", ['(appid:1)', "{id}"]],
  ["addExternalLicence", ['(username: \\"someone\\", password: \\"something\\", appid: 1, boughtplanid: 1)', "{ok}"]],
  //["suspendLicence", ['(licenceid:1)', "{ok}"]], // removed
  //["clearLicence", ['(licenceid:1)', "{ok}"]], // removed
  //["deleteLicenceAt", ['', ""]], special mutation with Date variables -> separate test
  //["deleteBoughtPlanAt", ['', ""]], special mutation with Date variables -> separate test
  ["voteForApp", ['(app:\\"TestApp\\")', "{ok}"]],
  ["updateCredentials", ['(licenceid:1)', ""]],
  ["updateLayout", ['(layout:{id:1})', ""]],
  ["createOwnApp", ['(ssoData:{name:\\"Test\\", loginurl:\\"asd\\", email:\\"asd\\", password:\\"asd\\",color:\\"asd\\"})', "{id}"]], //Upload parameter?
  //NEW:
  //deleteServiceLicenceAt -> separate test
  ['giveTemporaryAccess', ['(licences:[])', "{ok}"]],
  ['deleteService', ['(serviceid:1)',""]],
  ['updateTemporaryAccess', ['(licence: {licenceid: 1}, rightid: 1)', "{id}"]],
  ['removeLicence', ['(licenceid: 1, oldname: \\"rndname\\")', ""]],
  ['distributeLicence10', ['(licenceid: 1, userid: 1211)', '']],
  ['removeTemporaryAccess', ['(rightid: 1)', ""]],
  ['addExternalAccountLicence', ['(username: \\"username\\", password:\\"password\\", boughtplanid: 1)', ""]],
  ['failedIntegration', ['(data: {loginurl: \\"loginurl\\", name: \\"name\\", email: \\"testmail147@abv.bg\\", password: \\"newPass123\\", recaptcha: true, tries: 2, unloaded: true, passwordEntered: true, emailEntered: true})', ""]]
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

  it("testing deleteServiceLicenceAt with random serviceid, licenceid and date, expect AuthError", async () => {
    var query =
      '{"operationName":"onDeleteServiceLicenceAt","variables":{"time":"1564663209"},"query":"mutation onDeleteServiceLicenceAt($time: Date!) {deleteServiceLicenceAt(serviceid: 1, licenceid: 1, time: $time)}"}';
    var response = await testing(query);
    expectAuthError(response, "deleteServiceLicenceAt");
  });
});
