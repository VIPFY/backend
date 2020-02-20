//const tester = require("graphql-tester").tester;
//const EasyGraphQLTester = require('easygraphql-tester');
import { tester } from "graphql-tester";

const testing = tester({
  url: "http://backend-dev2.eu-central-1.elasticbeanstalk.com/graphql",
  // url: "https://api.vipfy.store/graphql",
  method: "POST",
  contentType: "application/json"
});
const queryWrapper = function(query) {
  return '{"operationName":null,"variables":{},"query":"' + query + '"}';
};

describe("Testing functions with unauthorized access", () => {
  it("Try to get id without being authorized, should me unsuccessful with 1 error", async () => {
    var query = "{ me { id } }";
    const response = await testing(queryWrapper(query));
    expect(response.success).toEqual(false);
    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.data.me).toEqual(null);
    expect(response.errors[0].name).toEqual("AuthError");
  });

  it("test ping, should be successful", async () => {
    var query = "mutation { ping { ok } }";
    const response = await testing(queryWrapper(query));
    expect(response.success).toEqual(true);
    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.errors).not.toBeDefined();
  });

  it("test checkEmail() with unused email, should be successful ", async () => {
    var query = 'mutation{checkEmail(email:\\"wrongemail@mail.com\\"){ok}}';
    const response = await testing(queryWrapper(query));
    expect(response.success).toEqual(true);
    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.errors).not.toBeDefined();
  });

  it("test checkAuthToken() with wrong email/token, should be unsuccessful with 1 error", async () => {
    var query =
      '{ checkAuthToken(token: \\"2A4S5D6A6\\", email: \\"wrongemail@mail.com\\"){ok}}';
    const response = await testing(queryWrapper(query));
    expect(response.success).toEqual(false);
    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
  });

  it("test login with incorrect credentials, should be unsuccessful with 1 error", async () => {
    var query =
      'mutation{signIn(email: \\"wrongemail@mail.com\\", password: \\"asd123\\"){ ok \\n token }}';
    const response = await testing(queryWrapper(query));
    expect(response).toBeDefined();
    expect(response.success).toEqual(false);
    expect(response.status).toEqual(200);
    expect(response.errors).toHaveLength(1);
    expect(response.data).toEqual(null);
    expect(response.errors[0].name).toEqual("NormalError");
  });
});
