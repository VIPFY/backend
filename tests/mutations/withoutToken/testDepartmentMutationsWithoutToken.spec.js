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
  ["updateStatisticData", ['(data:{})', "{ok}"]],
  ["addEmployee", ['(unitid:147, departmentid:147)', "{ok}"]],
  ["addCreateEmployee", ['(email: \\"\\", password: \\"\\",name:{title: \\"\\", firstname: \\"\\", middlename: \\"\\", lastname: \\"\\", suffix: \\"\\"}, departmentid:147)', "{ok}"]],
  ["addSubDepartment", ['(departmentid:147, name:\\"\\")', "{ok}"]],
  ["editDepartmentName", ['(departmentid:147, name:\\"\\")', "{ok}"]],
  ["deleteSubDepartment", ['(departmentid:147)', "{ok}"]],
  ["removeEmployee", ['(unitid:147,departmentid:147)', "{ok}"]],
  ["fireEmployee", ['(unitid:147)', "{ok}"]],
  ["banEmployee", ['(userid:1211)', "{ok}"]], 
  ["unbanEmployee", ['(userid:1211)', "{ok}"]], 
  //["updateCompanyPic", ['', ""]], //file:Upload!
  //["saveProposalData", ['(data:{})', "{ok}"]],// Expect NormalError
  ["changeAdminStatus", ['(unitid:1211,admin: true)', "{ok}"]],
  ["applyPromocode", ['(promocode:\\"1234\\")', "{ok}"]],
]);

describe("Testing department mutations without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `mutation{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }

  it("testing saveProposalData, expect NormalError", async () => {
    var query = "mutation{saveProposalData(data:{}){ok}}";
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(false);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
    expect(response.data).toEqual(null);
  });
});
