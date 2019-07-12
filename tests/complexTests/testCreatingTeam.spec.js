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

/*
 *
 */

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
    token = response.data.signIn.token;
    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(true);
    expect(response.errors).not.toBeDefined();
    expect(response.data.signIn.token).toBeDefined();
  });

  it("fetchCompany, expect success and name = IntegrationTests", async () => {
    const query = `{fetchCompany{name}}`;
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
    expect(response.data.fetchCompany.name).toEqual("IntegrationTests");
  });

  it("addTeam - adding a new team, expect success and increase in number of teams", async () => {
    var query = "{fetchCompanyTeams{id}}";
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });
    teams = response.data.fetchCompanyTeams;
    numberOfTeams = teams ? teams.length : 0;
/*
    query = `{"operationName":"onCreateTeam","variables":{team:{name: "TeamTest"}},"query": mutation onCreateTeam($team:JSON!){createTeam(team:$team, addemployees:[], apps: [])}}`;
    teamid = response.data.createTeam;
    console.log("TCL: query -> response", response)
  */  
    query = 'mutation{addTeam(name:\\"TeamTest\\", data: {}){unitid{id}}}';
    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });
    teamid = response.data.addTeam.unitid.id;

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(true);
    expect(response.errors).not.toBeDefined();
    expect(response.data.addTeam.unitid.id).toBeDefined();

    query = "{fetchCompanyTeams{id}}";
    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    teams = response.data.fetchCompanyTeams;
    expect(teams.length - numberOfTeams).toEqual(1);
  });

  describe("Test fetching team info:", () => {
    it("fetchCompanyTeams, expect success", async () => {
      const query = `{fetchCompanyTeams{id}}`;
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
      var expected = [{"id": `${teamid}`}];
      expect(response.data.fetchCompanyTeams).toEqual(expect.arrayContaining(expected));
    });

    it("fetchTeam with correct id, expect success", async () => {
      const query = `{fetchTeam(teamid:${teamid}){name}}`;
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
      expect(response.data.fetchTeam.name).toEqual("TeamTest");
    });

    it("fetchTeam with incorrect id, expect null", async () => {
      const query = `{fetchTeam(teamid:123465798){name}}`;
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
      expect(response.data.fetchTeam).toEqual(null);
    });
  });

  describe("Test adding/removing employees:", () => {

    var empId;

    it("fetchTeam with correct id before adding employee, expect success and 0 employees", async () => {
      const query = `{fetchTeam(teamid:${teamid}){employees{id}}}`;
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
      expect(response.data.fetchTeam.employees).toHaveLength(0);

    });

    it("addCreateEmployee, expect success", async () => {
      var random = getRandomInt(999999);

      const query = `mutation{addCreateEmployee(email: \\"empmail${random}@vipfy.store\\", password: \\"empPass123\\", name: {title: \\"\\", firstname: \\"Employee\\", middlename: \\"\\", lastname: \\"Two\\", suffix: \\"\\"}, departmentid: ${teamid} ){ok}}`;
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
      expect(response.data.addCreateEmployee.ok).toEqual(true);
    });

    it("fetchTeam with correct id after adding an employee, expect success and 1 employee", async () => {
      const query = `{fetchTeam(teamid:${teamid}){employees{id firstname lastname}}}`;
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
      expect(response.data.fetchTeam.employees).toHaveLength(1);
      expect(response.data.fetchTeam.employees[0].firstname).toEqual("Employee");
      expect(response.data.fetchTeam.employees[0].lastname).toEqual("Two");
      empId = response.data.fetchTeam.employees[0].id;
    });

    it("fetchTeams by userid, expect success", async () => {
      const query = `{fetchTeams(userid:${empId}){id}}`;
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
      expect(response.data.fetchTeams).toHaveLength(1);
      expect(response.data.fetchTeams[0].id).toEqual(teamid);
    });

    it("removeFromTeam, expect success", async () => {
      const query = `mutation{removeFromTeam(teamid:${teamid}, userid: ${empId}, keepLicences: [])}`;
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
      expect(response.data.removeFromTeam).toEqual(true);
    });

    it("fetchTeam with correct id after removing an employee, expect success and 0 employees", async () => {
      const query = `{fetchTeam(teamid:${teamid}){employees{id firstname lastname}}}`;
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
      expect(response.data.fetchTeam.employees).toHaveLength(0);
    });

    it("addToTeam with existing employee, expect success", async () => {
      const query = `mutation{addToTeam(teamid:${teamid}, userid: ${empId}, services: [])}`;
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
      expect(response.data.addToTeam).toEqual(true);
    });

    it("addToTeam with employeeid which is already in the team, expect NormalError", async () => {
      const query = `mutation{addToTeam(teamid:${teamid}, userid: ${empId}, services: [])}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(false);
      expect(response.errors).toHaveLength(1);
    });

    it("fetchTeam with correct id after adding an employee via addToTeam, expect success and 1 employee", async () => {
      const query = `{fetchTeam(teamid:${teamid}){employees{id firstname lastname}}}`;
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
      expect(response.data.fetchTeam.employees).toHaveLength(1);
      expect(response.data.fetchTeam.employees[0].firstname).toEqual("Employee");
      expect(response.data.fetchTeam.employees[0].lastname).toEqual("Two");
      expect(response.data.fetchTeam.employees[0].id).toEqual(empId);
    });

    it("forcePasswordChange, expect success", async () => {
      const query = `mutation{forcePasswordChange(userids:[1211]){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.forcePasswordChange.ok).toEqual(true);
    });

    it("check whether needspasswordchange was set to true after forcePasswordChange, expect success", async () => {
      const query = `{me{needspasswordchange}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.me.needspasswordchange).toEqual(true);
    });

    it("deleteEmployee, expect success", async () => {
      const query = `mutation{deleteEmployee(employeeid:${empId})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.deleteEmployee).toEqual(true);
    });
  });

  describe("Test creating and editing of employees", () => {
    var employeeId;

    it("fetchCompanySize before adding an employee, expect success and size = 1", async () => {
      const query = `{fetchCompanySize}`;
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
      expect(response.data.fetchCompanySize).toEqual("1");
    });

    it("createEmployee09 without adding phones, expect success", async () => {
      var random = getRandomInt(999999);
      const query = `mutation{createEmployee09(name: {title: \\"\\", firstname: \\"Employee\\", middlename: \\"\\", lastname: \\"One\\", suffix: \\"\\"}, emails: [{email:\\"epmmail${random}@vipfy.store\\"}], password: \\"empPass123\\")}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.createEmployee09).toBeDefined();
      employeeId = response.data.createEmployee09;
    });


    it("createEmployee09 with empty array of phones, expect success (remove when fixed)", async () => {
      var random = getRandomInt(999999);
      const query = `mutation{createEmployee09(name: {title: \\"\\", firstname: \\"Test\\", middlename: \\"\\", lastname: \\"Employee\\", suffix: \\"\\"}, emails: [{email:\\"epmmail${random}@vipfy.store\\"}], password: \\"empPass123\\", phones:[])}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.createEmployee09).toBeDefined();
      employeeId = response.data.createEmployee09;
    });

    it("fetchSemiPublicUser with correct userid, expect success and correct info", async () => {
      const query = `{fetchSemiPublicUser(unitid:${employeeId}){ firstname lastname }}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.fetchSemiPublicUser.firstname).toEqual("Test");
      expect(response.data.fetchSemiPublicUser.lastname).toEqual("Employee");
    });

    it("fetchCompanySize after adding an employee, expect success and size = 2", async () => {
      const query = `{fetchCompanySize}`;
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
      expect(response.data.fetchCompanySize).toEqual("2");
    });

    it("addEmployeeToTeam, expect success", async () => {
      const query = `mutation{addEmployeeToTeam(employeeid:${employeeId}, teamid: ${teamid})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.addEmployeeToTeam).toEqual(true);
    });

    it("fetchEmployees to check whether employee is added to team, expect success", async () => {
      const query = `{fetchEmployees{employee{id}}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.fetchEmployees[0].employee.id).toEqual("1211");
      expect(response.data.fetchEmployees[1].employee.id).toEqual(`${employeeId}`);
    });

    it("fetchTeam to check whether employee is added to team, expect success", async () => {
      const query = `{fetchTeam(teamid:${teamid}){employees{id}}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.fetchTeam.employees[0].id).toEqual(employeeId);
    });

    it("banEmployee, expect success", async () => {
      const query = `mutation{banEmployee(userid: ${employeeId}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.banEmployee.ok).toEqual(true);
    });

    it("fetchSemiPublicUser with correct userid, expect success and isbanned = true", async () => {
      const query = `{fetchSemiPublicUser(unitid:${employeeId}){ companyban }}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.fetchSemiPublicUser.companyban).toEqual(true);
    });

    // banned != companyban??
    it("fetchUserSecurityOverview with correct userid, expect success and banned = true", async () => {
      const query = `{fetchUserSecurityOverview{ banned }}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.fetchUserSecurityOverview[1].banned).toEqual(true);
    });


    it("unbanEmployee, expect success", async () => {
      const query = `mutation{unbanEmployee(userid: ${employeeId}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.unbanEmployee.ok).toEqual(true);
    });

    // banned != companyban??
    it("fetchUserSecurityOverview with correct userid, expect success and banned = true", async () => {
      const query = `{fetchUserSecurityOverview{ banned }}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.fetchUserSecurityOverview[1].banned).toEqual(false);
    });

    it("fetchSemiPublicUser with correct userid, expect success and isbanned = false", async () => {
      const query = `{fetchSemiPublicUser(unitid:${employeeId}){ companyban }}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.fetchSemiPublicUser.companyban).toEqual(false);
    });

    it("updateEmployee - change firstname, expect success", async () => {
      const query = `mutation{updateEmployee(user: {id: ${employeeId}, firstname: \\"Emp\\"}){firstname}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.updateEmployee.firstname).toEqual("Emp");
    });

    it("removeEmployee with correct id, expect success", async () => {
      const query = `mutation{removeEmployee(unitid:${employeeId}, departmentid: ${teamid}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.removeEmployee.ok).toEqual(true);
    });

    it("fetchTeam to check whether employee is removed from team, expect success", async () => {
      const query = `{fetchTeam(teamid:${teamid}){employees{id}}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.fetchTeam.employees).toHaveLength(0);
    });

    //TODO: addEmployee
    it("addEmployee with correct id, expect success", async () => {
      const query = `mutation{addEmployee(unitid:${employeeId}, departmentid: ${teamid}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.addEmployee.ok).toEqual(true);
    });

    it("fetchTeam with correct id, expect success", async () => {
      const query = `{fetchTeam(teamid:${teamid}){employees{id}}}`;
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
      expect(response.data.fetchTeam.employees[0].id).toEqual(`${employeeId}`);
    });

    it("deleteEmployee by id, expect success", async () => {
      const query = `mutation{deleteEmployee(employeeid:${employeeId})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.deleteEmployee).toBeDefined();
    });

    it("fetchSemiPublicUser with userid of deleted employee, expect error and/or no information returned", async () => {
      const query = `{fetchSemiPublicUser(unitid:${employeeId}){ firstname }}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(false);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("NormalError");
      expect(response.data.fetchSemiPublicUser).toEqual(null);
    });
  });

  it("deleteTeam - deleting the team, expect success and number of teams reduced", async () => {
    var query = `mutation{deleteTeam(teamid:${teamid})}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(true);
    expect(response.errors).not.toBeDefined();
    expect(response.data.deleteTeam).toEqual(true);

    query = "{fetchCompanyTeams{id}}";
    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    teams = response.data.fetchCompanyTeams;
    expect(teams.length - numberOfTeams).toEqual(0);
  });
});
