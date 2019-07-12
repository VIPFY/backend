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
  ["addPaymentData", ['', ""]], //JSON Objects?
  ["changeDefaultMethod", ['(card: \\"sth\\")', "{ok}"]],
  ["buyPlan", ['', ""]], //JSON Objects?
  ["cancelPlan", ['(planid: 1)', "{id}"]],
  ["updatePlan", ['', ""]], //JSON Objects?
  ["reactivatePlan", ['(planid: 1)', "{id}"]],
  ["createMonthlyInvoices", ['', ""]],
  ["createInvoice", ['(unitid:1)', ""]],
  ["setBoughtPlanAlias", ['(boughtplanid:1)', "{ok}"]],
  ["addBillingEmail", ['(email:\\"randomemail@mail.com\\")', "{email}"]],
  ["removeBillingEmail", ['(email:\\"randomemail@mail.com\\")', "{ok}"]],
  ["downloadBill", ['(billid:1)', ""]]
]);

describe("Testing bill mutations without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `mutation{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }
});
