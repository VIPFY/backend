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
  ["adminCreatePlan", ['(appId:2,plan:{name:\\"Test\\"})', "{ok}"]],
  ["adminUpdatePlan", ['(id:2,plan:{currency: \\"Euro\\"})', "{ok}"]],
  ["adminEndPlan", ['(id:2, enddate: \\"22-2-2022\\")', "{ok}"]],
  //["adminUpdateLicence", ['', ""]], //arguments? // removed
  //["adminCreateLicence", ['', ""]], // removed
  //["uploadAppImages", ['', ""]], //Upload! TODO!
  ["deleteImage", ['(image:\\"hopefullyNotExistingImage.jpg\\", id: 2, type: \\"jpg\\")', ""]], //type?
  ["createApp", ['(app:{})', ""]],
  ["updateApp", ['(appid:2)', "{name}"]],
  ["deleteApp", ['(id:2)', "{ok}"]],
  ["toggleAppStatus", ['(id:2)', "{ok}"]],
  //["adminCreateAddress", ['(addressData:{}, unitid:1)', "{ok}"]], // removed 
  //["adminUpdateAddress", ['(addressData:{}, id:1)', "{ok}"]], // removed
  //["adminDeleteAddress", ['(id:2)', "{ok}"]], // removed
  //["adminCreateEmail", ['(email:\\"testmail@mail.com\\", unitid:1)', "{ok}"]], // removed
  //["adminDeleteEmail", ['(email:\\"testmail@mail.com\\", unitid:1)', "{ok}"]], // removed
  //["createUser", ['(user:{})', "{ok}"]], //removed
  ["adminUpdateUser", ['(unitid:2)', "{ok}"]],
  ["adminDeleteUnit", ['(unitid:2)', "{ok}"]],
  ["freezeAccount", ['(unitid:2)', "{ok}"]],
  //["adminCreateCompany", ['(company:{})', "{ok}"]], // removed
  //["adminAddEmployee", ['(unitid:2, company:2)', "{ok}"]], // removed
  //["adminRemoveEmployee", ['(unitid:2, company:2)', "{ok}"]], //removed
  //["adminRemoveLicence", ['(licenceid:2)', "{ok}"]], // removed
  //["adminFetchUser", ['(name: \\"John Smith\\")', "{id}"]], //removed
  ["flushLocalCaches", ['', "{ok}"]]
]);

describe("Testing admin mutations without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `mutation{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }
});
