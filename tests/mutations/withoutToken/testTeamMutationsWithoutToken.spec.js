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
  ["addTeam", ['(name:\\"Team One\\", data:{})', "{name}"]],
  ["deleteTeam", ['(teamid:1)', ""]],
  //["updateTeamMembers", ['(members: 1, teamid: 1, action: ADD)', "{name}"]], // removed
  //["updateTeamInfos", ['(teamid:1, data:{})', "{name}"]], // removed
  //["addTeamLicence", ['(teamid:1, boughtplanid: 1)', "{name}"]] // removed
  //NEW:
  //createTeam - JSON Objects -> separate test
  //updateTeamPic - require UPLOAD TODO
  ['removeFromTeam', ['(teamid: 1895, userid: 1211)',""]],
  ['removeServiceFromTeam', ['(teamid: 1895, boughtplanid: 1)', ""]],
  ['addToTeam', ['(userid: 1211, teamid: 1895, services: [])', ""]],
  ['addEmployeeToTeam', ['(employeeid: 1211, teamid: 1895)', ""]],
  ['addAppToTeam', ['(serviceid: 1, teamid: 1895, employees: [])', ""]]
]);

describe("Testing team mutations without token", () => {
  for (let [func, [parameters, subfields]] of functionsWhichExpectAuthError) {
    it("testing " + func + ", expect AuthError", async () => {
      var query = `mutation{${func}${parameters}${subfields}}`;
      var response = await testing(queryWrapper(query));
      expectAuthError(response, func);
    });
  }

  it("testing createTeam, expect AuthError", async () => {
    var query = `{"operationName":\"onCreateTeam\","variables":{"team":{"name":\"IllegalTeam\"}, "addemployees":[], "apps":[]},"query":"mutation onCreateTeam($team:JSON!, $addemployees: [JSON]!, $apps:[JSON]!){createTeam(team:$team, addemployees: $addemployees, apps:$apps)}"}`;
    var response = await testing(query);
    expectAuthError(response, "createTeam");
  });
});
