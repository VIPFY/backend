import { tester } from "graphql-tester";

const testing = tester({
  url: "https://api.dev.vipfy.store/graphql",
  method: "POST",
  contentType: "application/json"
});

const queryWrapper = function(query) {
  return '{"operationName":null,"variables":{},"query":"' + query + '"}';
};

describe("OLD: Testing auth queries with valid token", () => {
  it("testing checkAuthToken with valid token and email", async () => {
    var query =
      '{checkAuthToken(email: \\"testmail147@abv.bg\\", token: \\"sLM9ME3KKlqZFkiorh0FK\\"){ok}}';
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token":
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVuaXRpZCI6IjE4OTEiLCJjb21wYW55IjoiMTg5MiJ9LCJpYXQiOjE1NjQ2NjIwNTEsImV4cCI6MTU2NTI2Njg1MX0.9F6S91Ta37OFVHkBuPU2sk0y66thIX6o1XrJ6XXofEk",
        "Content-Type": "application/json"
      }
    });
    expect(response).toBeDefined();
    expect(response.success).toEqual(true);
    expect(response.status).toEqual(200);
    expect(response.errors).not.toBeDefined();
    expect(response.data.checkAuthToken).toBeDefined();
  });

  it("testing me with valid token", async () => {
    var query = "{me{emails{email}}}";
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token":
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVuaXRpZCI6IjE4OTEiLCJjb21wYW55IjoiMTg5MiJ9LCJpYXQiOjE1NjQ2NjIwNTEsImV4cCI6MTU2NTI2Njg1MX0.9F6S91Ta37OFVHkBuPU2sk0y66thIX6o1XrJ6XXofEk",
        "Content-Type": "application/json"
      }
    });
    expect(response).toBeDefined();
    expect(response.success).toEqual(true);
    expect(response.status).toEqual(200);
    expect(response.errors).not.toBeDefined();
    expect(response.data.me.emails[0].email).toEqual("testmail147@abv.bg");
  });

  it("testing fetchSemiPublicUser with valid token", async () => {
    var query = "{fetchSemiPublicUser(userid:1211){emails{email}}}";
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token":
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVuaXRpZCI6IjE4OTEiLCJjb21wYW55IjoiMTg5MiJ9LCJpYXQiOjE1NjQ2NjIwNTEsImV4cCI6MTU2NTI2Njg1MX0.9F6S91Ta37OFVHkBuPU2sk0y66thIX6o1XrJ6XXofEk",
        "Content-Type": "application/json"
      }
    });
    expect(response).toBeDefined();
    expect(response.success).toEqual(true);
    expect(response.status).toEqual(200);
    expect(response.errors).not.toBeDefined();
    expect(response.data.me.emails[0].email).toEqual("testmail147@abv.bg");
  });
});
