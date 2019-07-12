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

var messageQueries = new Map([
  ["fetchDialog", ["(groupid:1)", "{id}"]],
  ["fetchGroups", ["", "{id}"]],
  ["fetchPublicUser", ["(userid:1)", "{isadmin}"]]
]);

var reviewQueries = new Map([
  ["allReviews", ["", "{stars}"]],
  ["fetchReviews", ["(appid:123)", "{id}"]]
]);

describe("Testing common queries without token", () => {
  it("testing fetchNotifications, expect AuthError", async () => {
    var query = "{fetchNotifications{id}}";
    var response = await testing(queryWrapper(query));
    expectAuthError(response, "fetchNotifications");
  });
});

describe("Testing demo queries without token", () => {
  it("testing fetchRecommendedApps, expect AuthError", async () => {
    var query = "{fetchRecommendedApps{id}}";
    var response = await testing(queryWrapper(query));
    expectAuthError(response, "fetchRecommendedApps");
  });
});

describe("Testing domain queries without token", () => {
  it("testing fetchDomains, expect AuthError", async () => {
    var query = "{fetchDomains{id}}";
    var response = await testing(queryWrapper(query));
    expectAuthError(response, "fetchDomains");
  });
});

describe("Testing message queries without token", () => {
  for (let [func, [parameters, subfields]] of messageQueries) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }
});

describe("Testing review queries without token", () => {
  for (let [func, [parameters, subfields]] of reviewQueries) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }
});

describe("Testing team queries without token", () => {
  it("testing fetchTeams, expect AuthError", async () => {
    var query = "{fetchTeams(userid:1){id}}";
    var response = await testing(queryWrapper(query));
    expectAuthError(response, "fetchTeams");
  });
});

describe("Testing tutorial queries without token", () => {
  it("testing tutorialSteps, expect AuthError", async () => {
    var query = "{tutorialSteps{page}}";
    var response = await testing(queryWrapper(query));
    expectAuthError(response, "tutorialSteps");
  });
});
