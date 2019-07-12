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
  ["createAddress", ['(addressData: {})', "{id}"]],
  ["updateAddress", ['(id:1)', "{id}"]],
  ["deleteAddress", ['(id:159)', "{ok}"]],
  ["createEmail", ['(emailData:{email:\\"testmail@mail.com\\"})', "{email}"]],
  ["updateEmail", ['', ""]], // Which one to test?
  ["updateEmail08", ['', ""]], // Difference?
  ["deleteEmail", ['(email:\\"randomtestmail@mail.com\\")', "{ok}"]],
  ["createPhone", ['(phoneData:{id:1})', "{id}"]],
  ["updatePhone", ['(id:1)', "{id}"]],
  ["deletePhone", ['(id:1)', "{ok}"]],
  //["newsletterSignup", ['', ""]], //Test with (in)valid email, multiple signups?
  //["newsletterSignupConfirm", ['', ""]],
  //["searchAddress", ['', ""]], unauthorized user?
  //["contact", ['', ""]], //TODO
]);

describe("Testing contact mutations without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `mutation{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }
});
