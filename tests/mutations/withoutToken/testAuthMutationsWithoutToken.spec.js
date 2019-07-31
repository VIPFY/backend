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
  // ["signUp", ['', ""]], separate test, expect NormalError when ToS not accepted
  // ["setupFinished", ['', ""]], : separate test, expect NormalError
  // ["signUpConfirm", ['', ""]], : separate test, expect NormalError
  // ["signIn", ['', ""]], : separate test, expect NormalError
  ["changePassword", ['(pw:\\"oldPass123\\", newPw:\\"newPass123\\", confirmPw:\\"newPass123\\")', "{ok}"]],
  ["agreeTos", ['', "{ok}"]],
  // ["forgotPassword", ['', ""]], : separate test, expect NormalError for invalid email
  ["forcePasswordChange", ['(userids:[2222,2223])', "{ok}"]],
  // ["redeemSetupToken", ['', ""]], : separate test, expect NormalError for invalid token
  // ["resendToken", ['', ""]] : separate test, expect NormalError for unused email
]);

describe("Testing auth mutations without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `mutation{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }

  describe("testing signUp without accepting ToS/Privacy agreement, expect NormalError", () => {
    it("both false", async () => {
      var query =
        'mutation{signUp(email: \\"testMail@mail.com\\", companyname: \\"testCompany\\", privacy: false, termsOfService: false){ok}}';
      var response = await testing(queryWrapper(query));
      expect(response).toBeDefined();
      expect(response.success).toEqual(false);
      expect(response.status).toEqual(200);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("NormalError");
      expect(response.errors[0].message).toEqual(
        "You have to confirm to our privacy agreement and our Terms of Service!"
      );
    });

    it("privacy: true, ToS: false", async () => {
      var query =
        'mutation{signUp(email: \\"testMail@mail.com\\", companyname: \\"testCompany\\", privacy: true, termsOfService: false){ok}}';
      var response = await testing(queryWrapper(query));
      expect(response).toBeDefined();
      expect(response.success).toEqual(false);
      expect(response.status).toEqual(200);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("NormalError");
      expect(response.errors[0].message).toEqual(
        "You have to confirm to our privacy agreement and our Terms of Service!"
      );
    });

    it("privacy: false, ToS: true", async () => {
      var query =
        'mutation{signUp(email: \\"testMail@mail.com\\", companyname: \\"testCompany\\", privacy: false, termsOfService: true){ok}}';
      var response = await testing(queryWrapper(query));
      expect(response).toBeDefined();
      expect(response.success).toEqual(false);
      expect(response.status).toEqual(200);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("NormalError");
      expect(response.errors[0].message).toEqual(
        "You have to confirm to our privacy agreement and our Terms of Service!"
      );
    });
  });

  it("testing setupFinished without arguments, expect NormalError", async () => {
    var query = "mutation{setupFinished{ok}}";
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.success).toEqual(false);
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
  });

  it("testing signUpConfirm with invalid arguments, expect NormalError", async () => {
    var query =
      'mutation{signUpConfirm(email: \\"testMail@mail.com\\", password:\\"testPass123\\", passwordConfirm:\\"testPass123\\", token: \\"InvalidToken1\\"){download{win64}}}';
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.success).toEqual(false);
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
    expect(response.errors[0].message).toEqual("Couldn't activate user!");
  });

  it("testing signIn with invalid arguments, expect NormalError", async () => {
    var query =
      'mutation{signIn(email: \\"testMail@mail.com\\", password: \\"testPass123\\"){ok}}';
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.success).toEqual(false);
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
    expect(response.errors[0].message).toEqual("Email or Password incorrect!");
  });

  it("testing forgotPassword with unused email argument, expect NormalError", async () => {
    var query =
      'mutation{forgotPassword(email: \\"hopefullyNotUsedEmail@mail.com\\"){ok}}';
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.success).toEqual(false);
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
    expect(response.errors[0].message).toEqual("Email or Password incorrect!");
  });

  it("testing redeemSetupToken with invalid token, expect NormalError", async () => {
    var query =
      'mutation{redeemSetupToken(setuptoken: \\"InvalidToken1\\"){ok}}';
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.success).toEqual(false);
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
    expect(response.errors[0].message).toEqual("token invalid");
  });

  it("testing resendToken with unused email, expect NormalError", async () => {
    var query =
      'mutation{resendToken(email: \\"hopefullyNotUsedEmail@mail.com\\")}';
    var response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.success).toEqual(false);
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
    expect(response.errors[0].message).toEqual("Couldn't find email!");
  });
});
