import { tester } from "graphql-tester";
import { request } from "request";
import { expression } from "@babel/template";

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

function successfulExecution(response) {
  expect(response).toBeDefined();
  expect(response.status).toEqual(200);
  expect(response.success).toEqual(true);
  expect(response.errors).not.toBeDefined();
}

// Implements expect(array).toContainObject(argument), checks whether an array contains the object given as argument
expect.extend({
  toContainObject(received, argument) {
    const pass = this.equals(
      received,
      expect.arrayContaining([expect.objectContaining(argument)])
    );

    if (pass) {
      return {
        message: () =>
          `expected ${this.utils.printReceived(
            received
          )} not to contain object ${this.utils.printExpected(argument)}`,
        pass: true
      };
    } else {
      return {
        message: () =>
          `expected ${this.utils.printReceived(
            received
          )} to contain object ${this.utils.printExpected(argument)}`,
        pass: false
      };
    }
  }
});

describe("Testing creation of a team and employees", () => {
  var token, team1id, team2id, teams, employeeId;

  it("signing in, expect success", async () => {
    /*
    mutation{
      signIn(email:"testmail@abv.bg", password: "testPass123"){
        token
      }
    }
    */
    const query =
      'mutation{signIn(email:\\"testmail147@abv.bg\\", password: \\"testPass123\\"){token}}';
    const response = await testing(queryWrapper(query));

    successfulExecution(response);
    expect(response.errors).not.toBeDefined();
    expect(response.data.signIn.token).toBeDefined();
    token = response.data.signIn.token;
  });

  it("fetchCompany, expect success and name = IntegrationTests", async () => {
    const query = `{fetchCompany{name}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    successfulExecution(response);
    expect(response.errors).not.toBeDefined();
    expect(response.data.fetchCompany.name).toEqual("IntegrationTests");
  });

  it("addTeam - adding a new team, expect success", async () => {
    var query =
      'mutation{addTeam(name:\\"TeamTest\\", data: {}){name unitid{id}}}';
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    successfulExecution(response);
    expect(response.errors).not.toBeDefined();
    expect(response.data.addTeam.unitid.id).toBeDefined();
    expect(response.data.addTeam.name).toEqual("TeamTest");
    team1id = response.data.addTeam.unitid.id;
  });

  it("createTeam - creating a new team, expect success", async () => {
    var query = `{"operationName":\"onCreateTeam\","variables":{"team":{"name":\"createTeam\"}, "addemployees":[], "apps":[]},"query":"mutation onCreateTeam($team:JSON!, $addemployees: [JSON]!, $apps:[JSON]!){createTeam(team:$team, addemployees: $addemployees, apps:$apps)}"}`;
    var response = await testing(query, {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    successfulExecution(response);
    expect(response.errors).not.toBeDefined();
    team2id = response.data.createTeam;
  });

  it("fetchCompanyTeams - check whether teams were created, expect success", async () => {
    var query = `{fetchCompanyTeams{id}}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    successfulExecution(response);
    expect(response.data.fetchCompanyTeams).toContainObject({
      id: `${team1id}`
    });
    expect(response.data.fetchCompanyTeams).toContainObject({
      id: `${team2id}`
    });
  });

  it("editDepratmentName - change team name, expect success", async () => {
    var query = `mutation{editDepartmentName(departmentid: ${team1id}, name: \\"ChangedName\\"){ok}}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    successfulExecution(response);
    expect(response.data.editDepartmentName.ok).toEqual(true);
  });

  it("fetchTeam - check whether team name was changed, expect success", async () => {
    var query = `{fetchTeam(teamid: ${team1id}){name}}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    successfulExecution(response);
    expect(response.data.fetchTeam.name).toEqual("ChangedName");
  });

  //fetch all info
  describe("Test fetching complete company/team info:", () => {
    it("fetchCompany, expect success", async () => {
      const query = `{fetchCompany{name legalinformation unitid{id} banned deleted suspended profilepicture employees employeedata{id} managelicences apps domains{id} createdate promocode setupfinished iscompany isprivate internaldata}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      var company = response.data.fetchCompany;
      expect(company.name).toEqual("IntegrationTests");
      expect(company.legalinformation).toBeDefined();
      expect(company.unitid.id).toEqual("1212");
      expect(company.profilepicture).toBeDefined();
      expect(company.employees).toBeDefined();
      expect(company.employeedata).toBeDefined();
      expect(company.managelicences).toBeDefined();
      expect(company.apps).toBeDefined();
      expect(company.domains).toBeDefined();
      expect(company.createdate).toBeDefined();
      expect(company.promocode).toBeDefined();
      expect(company.setupfinished).toEqual(true);
      expect(company.iscompany).toEqual(true);
      expect(company.isprivate).toEqual(false);
      expect(company.internaldata).toBeDefined();
    });

    it("fetchDepartmentsData, expect success", async () => {
      const query = `{fetchDepartmentsData{id children children_data department{unitid{id} name} employees{id} level parent}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      var department = response.data.fetchDepartmentsData[0];
      expect(department.id).toEqual("1212");
      expect(department.children).toEqual(expect.arrayContaining(["1211"]));
      expect(department.children_data).toBeDefined();
      expect(department.department.unitid.id).toEqual("1212");
      expect(department.department.name).toEqual("IntegrationTests");
      expect(department.level).toBeDefined();
      expect(department.parent).toBeDefined();
    });

    it("fetchEmployees, expect success", async () => {
      const query = `{fetchEmployees{id{unitid{id} name} childid{id} employee{id firstname lastname}}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.fetchEmployees).toEqual(
        expect.arrayContaining([
          {
            id: {
              unitid: {
                id: "1212"
              },
              name: "IntegrationTests"
            },
            childid: null,
            employee: {
              id: "1211",
              firstname: "Test",
              lastname: "User"
            }
          }
        ])
      );
    });

    it("fetchVipfyPlan, expect success", async () => {
      const query = `{fetchVipfyPlan{id buytime alias endtime description key buyer{id} payer{id} usedby{id} planid{id name} licences{id} totalprice}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      var vplan = response.data.fetchVipfyPlan;
      expect(vplan.id).toEqual("2522");
      expect(vplan.buytime).toEqual("1564389759408");
      expect(vplan.alias).toBeDefined();
      expect(vplan.endtime).toBeDefined();
      expect(vplan.description).toBeDefined();
      expect(vplan.key).toBeDefined();
      expect(vplan.buyer.id).toEqual("1211");
      expect(vplan.payer.id).toEqual("1212");
      expect(vplan.usedby.id).toEqual("1212");
      expect(vplan.planid.id).toEqual("125");
      expect(vplan.planid.name).toEqual("Vipfy Basic");
      expect(vplan.licences).toBeDefined();
      expect(vplan.totalprice).toBeDefined();
    });

    it("fetchCompanyTeams, expect success", async () => {
      const query = `{fetchCompanyTeams{id name legalinformation unitid{id} banned deleted suspended profilepicture employees{id} employeenumber managelicences apps domains{id} licences{id} services{id} createdate promocode setupfinished iscompany internaldata}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.fetchCompanyTeams).toContainObject({ id: "1453" });
    });
  });

  describe("Test employee manipulation:", () => {
    var empId;

    it("fetchTeam with correct id before adding employee, expect success and 0 employees", async () => {
      const query = `{fetchTeam(teamid:${team1id}){employees{id}}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.fetchTeam.employees).toHaveLength(0);
    });

    it("createEmployee09, expect success", async () => {
      var random = getRandomInt(999999);
      const query = `mutation{createEmployee09(name: {title: \\"\\", firstname: \\"Temporary\\", middlename: \\"Test\\", lastname: \\"Employee\\", suffix: \\"\\"}, emails: [{email:\\"epmmail${random}@vipfy.store\\"}], password: \\"empPass123\\")}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.createEmployee09).toBeDefined();
      employeeId = response.data.createEmployee09;
    });

    it("addToTeam - add created employee to Team 1, expect success", async () => {
      var query = `mutation{addToTeam(userid: ${employeeId}, teamid: ${team1id}, services: [])}`;
      var response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.addToTeam).toEqual(true);
    });

    it("fetchTeam - fetch Team 1 to check whether employee was added, expect success and correct employee information", async () => {
      const query = `{fetchTeam(teamid:${team1id}){employees{id firstname middlename lastname}}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      var expectedEmployeeData = {
        id: `${employeeId}`,
        firstname: "Temporary",
        middlename: "Test",
        lastname: "Employee"
      };
      expect(response.data.fetchTeam.employees).toHaveLength(1);
      expect(response.data.fetchTeam.employees).toContainObject(
        expectedEmployeeData
      );
    });

    it("trying to add the same employee to the same team via addToTeam, expect failure and NormalError", async () => {
      var query = `mutation{addToTeam(userid: ${employeeId}, teamid: ${team1id}, services: [])}`;
      var response = await testing(queryWrapper(query), {
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
    });

    it("addEmployee - add created employee to Team 2, expect success", async () => {
      var query = `mutation{addEmployee(unitid: ${employeeId}, departmentid: ${team2id}){ok}}`;
      var response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.addEmployee.ok).toEqual(true);
    });

    it("fetchTeams by userid, expect success and employee being in 2 teams", async () => {
      const query = `{fetchTeams(userid:${employeeId}){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.fetchTeams).toHaveLength(2);
      expect(response.data.fetchTeams).toContainObject({ id: `${team1id}` });
      expect(response.data.fetchTeams).toContainObject({ id: `${team2id}` });
    });

    it("trying to add the same employee to the same team via addEmployee, expect failure and NormalError", async () => {
      var query = `mutation{addEmployee(unitid: ${employeeId}, departmentid: ${team2id}){ok}}`;
      var response = await testing(queryWrapper(query), {
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
    });

    it("removeFromTeam - remove employee from Team 2, expect success", async () => {
      const query = `mutation{removeFromTeam(teamid:${team2id}, userid: ${employeeId}, keepLicences: [])}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.removeFromTeam).toEqual(true);
    });
    //TODO: Maybe try to remove twice, check whether there is a problem.

    it("fetchTeam - fetch Team 2 after removing an employee, expect success and employee removed", async () => {
      const query = `{fetchTeam(teamid:${team2id}){employees{id}}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.fetchTeam.employees).not.toContainObject({
        id: `${employeeId}`
      });
    });

    it("addEmployeeToTeam - adds the employee to Team 2, expect success", async () => {
      const query = `mutation{addEmployeeToTeam(employeeid:${employeeId}, teamid: ${team2id})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.addEmployeeToTeam).toEqual(true);
    });

    it("fetchTeams by userid, expect success and employee being in 2 teams", async () => {
      const query = `{fetchTeams(userid:${employeeId}){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.fetchTeams).toHaveLength(2);
      expect(response.data.fetchTeams).toContainObject({ id: `${team1id}` });
      expect(response.data.fetchTeams).toContainObject({ id: `${team2id}` });
    });

    it("trying to add the same employee to the same team via addEmployeeToTeam, expect failure and NormalError", async () => {
      const query = `mutation{addEmployeeToTeam(employeeid:${employeeId}, teamid: ${team2id})}`;
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
    });

    it("forcePasswordChange, expect success", async () => {
      const query = `mutation{forcePasswordChange(userids:[${employeeId}]){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.forcePasswordChange.ok).toEqual(true);
    });

    it("fetchUserSecurityOverview - check everything about employee", async () => {
      const query = `{fetchUserSecurityOverview{id unitid{firstname middlename lastname} needspasswordchange banned suspended passwordlength passwordstrength}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      var expectedData = {
        id: `${employeeId}`,
        unitid: {
          firstname: "Temporary",
          middlename: "Test",
          lastname: "Employee"
        },
        needspasswordchange: true,
        passwordlength: 10,
        passwordstrength: 2,
        banned: false,
        suspended: false
      };
      expect(response.data.fetchUserSecurityOverview).toContainObject(
        expectedData
      );
    });

    it("banEmployee, expect success", async () => {
      const query = `mutation{banEmployee(userid: ${employeeId}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.banEmployee.ok).toEqual(true);
    });

    it("fetchSemiPublicUser with employeeid, expect success and companyban = true", async () => {
      const query = `{fetchSemiPublicUser(userid:${employeeId}){ companyban }}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.fetchSemiPublicUser.companyban).toEqual(true);
    });

    it("unbanEmployee, expect success", async () => {
      const query = `mutation{unbanEmployee(userid: ${employeeId}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.unbanEmployee.ok).toEqual(true);
    });

    it("fetchSemiPublicUser with employeeId, expect success and companyban = false", async () => {
      const query = `{fetchSemiPublicUser(userid:${employeeId}){ companyban }}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.fetchSemiPublicUser.companyban).toEqual(false);
    });

    it("changeAdminStatus - set employee as admin and check whether isadmin has changed to true, expect success", async () => {
      var query = `mutation{changeAdminStatus(unitid:${employeeId}, admin:true){id status}}`;
      var response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.changeAdminStatus.id).toEqual(`${employeeId}`);
      expect(response.data.changeAdminStatus.status).toEqual(true);

      query = `{fetchSemiPublicUser(userid:${employeeId}){ isadmin }}`;
      response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.fetchSemiPublicUser.isadmin).toEqual(true);
    });

    it("changeAdminStatus - remove employee admin rights and check whether isadmin has changed to false, expect success", async () => {
      var query = `mutation{changeAdminStatus(unitid:${employeeId}, admin:false){id status}}`;
      var response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.changeAdminStatus.id).toEqual(`${employeeId}`);
      expect(response.data.changeAdminStatus.status).toEqual(false);

      query = `{fetchSemiPublicUser(userid:${employeeId}){ isadmin }}`;
      response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.fetchSemiPublicUser.isadmin).toEqual(false);
    });

    it("updateEmployee - change firstname of employee, expect success", async () => {
      const query = `mutation{updateEmployee(user: {id: ${employeeId}, firstname: \\"SoonToBeDeleted\\"}){firstname}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.updateEmployee.firstname).toEqual("SoonToBeDeleted");
    });

    it("updateEmployeePassword - change password of employee, expect success", async () => {
      const query = `mutation{updateEmployeePassword(unitid:${employeeId}, password: \\"LongEnoughPassword123\\"){passwordlength passwordstrength}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.updateEmployeePassword.passwordlength).toEqual(21);
      expect(response.data.updateEmployeePassword.passwordstrength).toEqual(3);
    });

    var impToken;
    it("impersonate employee, expect success", async () => {
      const query = `mutation{impersonate(unitid:${employeeId})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.impersonate).toBeDefined();
      impToken = response.data.impersonate;
    });
    //TODO: checks for impersonate token

    it("deleteEmployee, expect success", async () => {
      const query = `mutation{deleteEmployee(employeeid:${employeeId})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      successfulExecution(response);
      expect(response.data.deleteEmployee).toEqual(true);
    });

    it("fetchSemiPublicUser with userid of deleted employee, expect error and/or no information returned", async () => {
      const query = `{fetchSemiPublicUser(userid:${employeeId}){ firstname }}`;
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

    it("fetchPublicUser with userid of deleted employee, expect error and/or no information returned", async () => {
      const query = `{fetchPublicUser(userid:${employeeId}){ firstname }}`;
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
      expect(response.data.fetchPublicUser).toEqual(null);
    });

    it("fetchEmployees to check whether information about deleted employee is revealed, expect success and/or no information about deleted employee returned", async () => {
      const query = `{fetchEmployees{ employee{id}}}`;
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
      var expected = { employee: { id: `${employeeId}` } };
      expect(response.data.fetchEmployees).not.toContainObject(expected);
    });

    it("fetchUserSecurityOverview to check whether information about deleted employee is revealed, expect success and/or no information about deleted employee returned", async () => {
      const query = `{fetchUserSecurityOverview{id}}`;
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
      var expected = { id: `${employeeId}` };
      expect(response.data.fetchUserSecurityOverview).not.toContainObject(
        expected
      );
    });

    it("fetchTeam to check whether information about deleted employee is revealed, expect success and/or no information about deleted employee returned", async () => {
      const query = `{fetchTeam(teamid:${team1id}){employees{id}}}`;
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
      var expected = { id: `${employeeId}` };
      expect(response.data.fetchTeam.employees).not.toContainObject(expected);
    });

    it("fetchTeams to check whether information about deleted employee is revealed, expect failure and no information revealed", async () => {
      const query = `{fetchTeams(userid: ${employeeId}){id}}`;
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
    });
  });

  it("deleteTeam - delete the created teams, expect success", async () => {
    //delete first team
    var query = `mutation{deleteTeam(teamid:${team1id})}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    successfulExecution(response);
    expect(response.data.deleteTeam).toEqual(true);

    //delete second team
    query = `mutation{deleteTeam(teamid:${team2id})}`;
    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    successfulExecution(response);
    expect(response.data.deleteTeam).toEqual(true);
  });
});
