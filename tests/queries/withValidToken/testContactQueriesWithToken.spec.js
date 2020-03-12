import { tester } from "graphql-tester";

const testing = tester({
  url: "https://api.dev.vipfy.store/graphql",
  method: "POST",
  contentType: "application/json"
});

const queryWrapper = function(query) {
  return '{"operationName":null,"variables":{},"query":"' + query + '"}';
};

describe("Testing contact queries with token", () => {
  var token;
  it("signing in, expect success", async () => {
    const query =
      'mutation{signIn(email:\\"testmail147@abv.bg\\", password: \\"testPass123\\"){token}}';
    const response = await testing(queryWrapper(query));

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(true);
    expect(response.errors).not.toBeDefined();
    expect(response.data.signIn.token).toBeDefined();
    token = response.data.signIn.token;
  });

  it("fetchAddresses - query all fields of Address, expect success", async () => {
    const query =
      "{fetchAddresses{id country address description priority tags verified}}";
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(true);
    expect(response.errors).not.toBeDefined();
  });

  it("fetchEmails - query all fields of Email, expect success", async () => {
    const query =
      "{fetchEmails{unitid{id createdate profilepicture} email verified autogenerated description priority tags createdat verifyuntil}}";
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(true);
    expect(response.errors).not.toBeDefined();
  });

  it("fetchPhones - query all fields of Phone, expect success", async () => {
    const query =
      "{fetchPhones{id number verified autogenerated description priority tags}}";
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(true);
    expect(response.errors).not.toBeDefined();
  });

  it("searchAddressByCompanyName, expect success", async () => {
    const query = "{searchAddressByCompanyName}";
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(true);
    expect(response.errors).not.toBeDefined();
  });
});