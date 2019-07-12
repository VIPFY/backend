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
// Mutations: distributeLicenceToDepartment, revokeLicencesFromDepartment,
// distributeLicence, revokeLicence, agreeToLicence, trackMinutesSpent,
// addExternalBoughtPlan, addExternalLicence, suspendLicence, clearLicence,
// deleteLicenceAt, deleteBoughtPlanAt, voteForApp, updateCredentials, updateLayout, createOwnApp

// Bugs:

// Kinda:

// Done:

describe("Testing app mutations with valid token", () => {});
