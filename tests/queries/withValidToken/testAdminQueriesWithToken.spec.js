import { tester } from "graphql-tester";

const testing = tester({
  url: "https://api.dev.vipfy.store/graphql",
  method: "POST",
  contentType: "application/json"
});

const queryWrapper = function(query) {
  return '{"operationName":null,"variables":{},"query":"' + query + '"}';
};

const expectAdminError = function(response, queryName) {
  expect(response).toBeDefined();
  expect(response.success).toEqual(false);
  expect(response.status).toEqual(200);
  expect(response.errors).toHaveLength(1);
  expect(response.errors[0].name).toEqual("AdminError");

  if (response.data) {
    expect(response.data[queryName]).toEqual(null);
  } else expect(response.data).toEqual(null);
};
// prettier-ignore
var functions = new Map([
  ['adminFetchAllApps', ['(limit:10, offset: 0, sortOptions: {name: \\"Name\\", order: ASC})',"{name}"]],
  ['admin', ["", "{id}"]],
  ['adminFetchAppById', ['(id:1)', "{name}"]],
  ['allUsers', ['', '{id}']],
  ['allCompanies', ['', "{unitid{id}}"]],
  ['fetchServerStats', ['', "{data}"]]
]);

describe("Testing admin queries with token", () => {
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

  for (let [func, [parameters, subfields]] of functions) {
    it("testing " + func + ", expect AdminError", async () => {
      var query = `{${func}${parameters}${subfields}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });
      expectAdminError(response, func);
    });
  }
});
