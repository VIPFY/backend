import { tester } from "graphql-tester";
import { request } from "request";

const testing = tester({
  url: "https://api.dev.vipfy.store/graphql",
  method: "POST",
  contentType: "application/json"
});

const queryWrapper = function(query) {
  return '{"operationName":null,"variables":{},"query":"' + query + '"}';
};

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

describe("Testing creation of a team and employees", () => {
  var token,
    teamid,
    teams,
    numberOfTeams = 0,
    numberOfEmployees = 0;

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

  /*it("fetchDepartments, expect success and info about depatments", async () => {
    const query = `{fetchDepartments{id department{name}}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.success).toEqual(true);
    expect(response.status).toEqual(200);
    expect(response.data.fetchDepartments[0].id).toEqual("1212");
    expect(response.data.fetchDepartments[0].department.name).toEqual("IntegrationTests");
  });

  it("editDepartmentName, expect success", async () => {
    const query = `mutation{editDepartmentName(departmentid:)}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.success).toEqual(true);
    expect(response.status).toEqual(200);
    expect(response.data.fetchDepartments[0].id).toEqual("1212");
    expect(response.data.fetchDepartments[0].department.name).toEqual("IntegrationTests");
  });*/

  it("editDepartmentName, expect success", async () => {
    var numOfEntries, numOfErrors;
    var query = `{allApps{id}}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    numOfEntries = response.data.allApps.length;
    console.log("TCL: numOfEntries", numOfEntries);

    query = `{allApps{developername}}`;
    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });
    console.log("sth sth");
    numOfErrors = response.errors.length;
    console.log("TCL: numofErrors", numOfErrors);

    expect(response.data.allApps).toHaveLength(numOfEntries);
  });
});
