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

var functionsWhichExpectAuthError = new Map([
  ["fetchCompany", ["", "{unitid{id}}"]],
  //["fetchCompanySize", ["", ""]], // removed
  //["fetchDepartments", ["", "{id}"]], // removed
  ["fetchDepartmentsData", ["", "{id}"]],
  ["fetchEmployees", ["", "{id{internaldata}}"]],
  ["fetchUserSecurityOverview", ["", "{id}"]],
  //["fetchAddressProposal", ['(placeid: \\"Berlin\\")', ""]], // removed
  ["fetchVipfyPlan", ["", "{description}"]]
]);

describe("Testing department queries without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }
});
