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
  //["updateProfilePic", ['', ""]], //TODO: UPLOAD!!!
  //["updateMyself", ['(user:{firstname:\\"John\\"})', "{id}"]], // removed
  ["updateEmployee", ['(user:{id:1211, firstname:\\"John\\"})', "{id}"]],
  ["setConsent", ['(consent:true)', "{id}"]],
  //NEW:
  //updateEmployeePic //TODO: UPLOAD!
  ['updateUser', ['(user:{firstname:\\"John\\"})', '{ok}']],
  ['updateEmployeePassword', ['(unitid:1211, password:\\"testPass147\\")', '{id}']],
  ['impersonate', ['(unitid:1211)', ""]]
]);

describe("Testing unit mutations without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `mutation{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      //console.log("TCL: response", response);
      expectAuthError(response, func);
    });
  }
});
