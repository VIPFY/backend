import { tester } from "graphql-tester";
import { request } from "request";
import { userInfo } from "os";

const testing = tester({
  url: "https://api.dev.vipfy.store/graphql",
  method: "POST",
  contentType: "application/json"
});

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

const queryWrapper = function(query) {
  return '{"operationName":null,"variables":{},"query":"' + query + '"}';
};

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function successfulExecutionBase(response) {
  expect(response).toBeDefined();
  expect(response.status).toEqual(200);
  expect(response.success).toEqual(true);
}

function failedExecutionBase(response) {
  expect(response).toBeDefined();
  expect(response.status).toEqual(200);
  expect(response.success).toEqual(false);
}

function expectRightsError(response, func) {
  failedExecutionBase(response);
  expect(response.errors).toHaveLength(1);
  expect(response.errors[0].name).toEqual("RightsError");
  if (response.data) {
    expect(response.data[func]).toEqual(null);
  } else expect(response.data).toEqual(null);
}

/*
 *  Testing company admin access restrictions
 */

describe("Testing company admin access restrictions", () => {
  var token1, token2;
  var user1Id, user2Id;
  var team1Id, team2Id;
  var team1Name, team2Name;

  it("signIn user1, expect success", async () => {
    const query =
      'mutation{signIn(email:\\"testmail147@abv.bg\\", password: \\"testPass123\\"){token}}';
    const response = await testing(queryWrapper(query));

    successfulExecutionBase(response);
    expect(response.errors).not.toBeDefined();
    expect(response.data.signIn.token).toBeDefined();
    token1 = response.data.signIn.token;
  });

  it("signIn user2, expect success", async () => {
    const query =
      'mutation{signIn(email:\\"testmail789@abv.bg\\", password: \\"testPass789\\"){token}}';
    const response = await testing(queryWrapper(query));

    successfulExecutionBase(response);
    expect(response.errors).not.toBeDefined();
    expect(response.data.signIn.token).toBeDefined();
    token2 = response.data.signIn.token;
  });

  it("fetchCompany - check companies names, expect succcess", async () => {
    var query = "{fetchCompany{name}}";
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    successfulExecutionBase(response);
    expect(response.data.fetchCompany.name).toBeDefined();
    expect(response.data.fetchCompany.name).toEqual("IntegrationTests");

    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token2,
        "Content-Type": "application/json"
      }
    });

    successfulExecutionBase(response);
    expect(response.data.fetchCompany.name).toBeDefined();
    expect(response.data.fetchCompany.name).toEqual("TestCompany");
  });

  it("get general data(user IDs, team IDs), expect success", async () => {
    var query = "{me{id}}";
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    expect(response.data.me.id).toBeDefined();
    user1Id = response.data.me.id;

    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token2,
        "Content-Type": "application/json"
      }
    });
    expect(response.data.me.id).toBeDefined();
    user2Id = response.data.me.id;

    query = "{fetchCompanyTeams{id name}}";
    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });
    expect(response.data.fetchCompanyTeams[0].id).toBeDefined();
    team1Id = response.data.fetchCompanyTeams[0].id;
    expect(response.data.fetchCompanyTeams[0].name).toBeDefined();
    team1Name = response.data.fetchCompanyTeams[0].name;

    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token2,
        "Content-Type": "application/json"
      }
    });
    expect(response.data.fetchCompanyTeams[0].id).toBeDefined();
    team2Id = response.data.fetchCompanyTeams[0].id;
    expect(response.data.fetchCompanyTeams[0].name).toBeDefined();
    team2Name = response.data.fetchCompanyTeams[0].name;
  });

  describe("Team/employee related:", () => {
    it("editDepartmentName - trying to change the name of a team which does not belong to my company, expect failure - RightsError", async () => {
      var query = `mutation{editDepartmentName(departmentid: ${team1Id}, name: \\"ChangedFromOutside\\"){ok}}`;
      var response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      if (response.success == true) {
        //redo the changes
        query = `mutation{editDepartmentName(departmentid: ${team1Id}, name: \\"${team1Name}\\"){ok}}`;
        const response1 = await testing(queryWrapper(query), {
          headers: {
            "x-token": token1,
            "Content-Type": "application/json"
          }
        });
        successfulExecutionBase(response1);
        expect(response.data.editDepartmentName.ok).toEqual(true);
      }

      expectRightsError(response);

      //Checks whether team name was changed
      query = "{fetchCompanyTeams{id name}}";
      response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      successfulExecutionBase(response);
      expect(response.data.fetchCompanyTeams[0].id).toEqual(`${team1Id}`);
      expect(response.data.fetchCompanyTeams[0].name).toEqual(`${team1Name}`);
    });

    it("banEmployee as admin from different company, expect failure - RightsError", async () => {
      const query = `mutation{banEmployee(userid:${user2Id}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "banEmployee");
    });

    it("unbanEmployee as admin from different company, expect failure - RightsError", async () => {
      const query = `mutation{unbanEmployee(userid:${user2Id}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "unbanEmployee");
    });

    it("changeAdminStatus as admin from different company, expect failure - RightsError", async () => {
      const query = `mutation{changeAdminStatus(unitid:${user1Id}, admin:false){id status}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "changeAdminStatus");
    });

    it("changeAdminStatus as admin from different company, expect failure - RightsError", async () => {
      const query = `mutation{changeAdminStatus(unitid:${user1Id}, admin:true){id status}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "changeAdminStatus");
    });

    it("forcePasswordChange as admin from different company, expect failure - RightsError", async () => {
      const query = `mutation{forcePasswordChange(userids:[${user2Id}]){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "forcePasswordChange");
    });

    it("updateEmployeePassword - trying to change the password of user who is not in my company, expect failure - RightsError", async () => {
      const query = `mutation{updateEmployeePassword(unitid: ${user1Id}, password: \\"testPass123\\"){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "updateEmployeePassword");
    });

    it("impersonate - trying to impersonate a user who is not in my company, expect failure - RightsError", async () => {
      const query = `mutation{impersonate(unitid: ${user1Id})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "updateEmployeePassword");
    });

    it("createEmployee - trying to create and add employee to a team which is not in my company, expect failure - RightsError", async () => {
      const query = `{"operationName":\"onCreateEmployee\","variables":{"addpersonal":{"name":{"title": \"\", "firstname":\"Employee\", "middlename": \"Creation\", "lastname":\"Test\", "suffix":\"\"}, "password": \"empPass123\", "wmail1":\"empmail34567@vipfy.store\"}, "addteams":[${team1Id}], "apps":[]},"query":\"mutation onCreateEmployee($addpersonal:JSON!, $addteams: [JSON]!, $apps:[JSON]!){createEmployee(addpersonal:$addpersonal, addteams: $addteams, apps:$apps)}\"}`;
      const response = await testing(query, {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "createEmployee");
    });

    describe("addToTeam:", () => {
      it("addToTeam - trying to add employee which is NOT in current company to team which is NOT in current company via addToTeam, expect failure", async () => {
        const query = `mutation{addToTeam(userid:${user2Id}, teamid:${team2Id}, services: [])}`;
        const response = await testing(queryWrapper(query), {
          headers: {
            "x-token": token1,
            "Content-Type": "application/json"
          }
        });

        if (response.success) {
          //removeEmployee if worked
          var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid:${team2Id}){ok}}`;
          var response1 = await testing(queryWrapper(query1), {
            headers: {
              "x-token": token2,
              "Content-Type": "application/json"
            }
          });
        }

        expectRightsError(response, "addToTeam");
      });

      it("addToTeam - trying to add employee to a team which is NOT in current company via addToTeam, expect failure", async () => {
        const query = `mutation{addToTeam(userid:${user2Id}, teamid:${team1Id}, services: [])}`;
        const response = await testing(queryWrapper(query), {
          headers: {
            "x-token": token2,
            "Content-Type": "application/json"
          }
        });

        if (response.success) {
          //removeEmployee if worked
          var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid:${team1Id}){ok}}`;
          var response1 = await testing(queryWrapper(query1), {
            headers: {
              "x-token": token1,
              "Content-Type": "application/json"
            }
          });
        }

        expectRightsError(response, "addToTeam");
      });

      it("addToTeam - trying to add employee from different company to a team of our company via addToTeam, expect failure", async () => {
        var query = `mutation{addToTeam(userid:${user2Id}, teamid:${team1Id}, services: [])}`;
        var response = await testing(queryWrapper(query), {
          headers: {
            "x-token": token1,
            "Content-Type": "application/json"
          }
        });

        if (response.success) {
          //removeEmployee if worked
          var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid:${team1Id}){ok}}`;
          var response1 = await testing(queryWrapper(query1), {
            headers: {
              "x-token": token1,
              "Content-Type": "application/json"
            }
          });
        }
        expectRightsError(response, "addToTeam");
      });
    });
    describe("addEmployeeToTeam:", () => {
      it("addEmployeeToTeam - trying to add employee which is NOT in current company to a team which is NOT in current company via addEmployeeToTeam, expect failure", async () => {
        const query = `mutation{addEmployeeToTeam(employeeid:${user2Id}, teamid:${team2Id})}`;
        const response = await testing(queryWrapper(query), {
          headers: {
            "x-token": token1,
            "Content-Type": "application/json"
          }
        });

        if (response.success) {
          //removeEmployee if worked
          var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid:${team2Id}){ok}}`;
          var response1 = await testing(queryWrapper(query1), {
            headers: {
              "x-token": token2,
              "Content-Type": "application/json"
            }
          });
        }

        expectRightsError(response, "addEmployeeToTeam");
      });

      it("addEmployeeToTeam - trying to add employee to team which is NOT in current company via addEmployeeToTeam, expect failure", async () => {
        const query = `mutation{addEmployeeToTeam(employeeid:${user2Id}, teamid:${team1Id})}`;
        const response = await testing(queryWrapper(query), {
          headers: {
            "x-token": token2,
            "Content-Type": "application/json"
          }
        });

        if (response.success) {
          //removeEmployee if worked
          var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid:${team1Id}){ok}}`;
          var response1 = await testing(queryWrapper(query1), {
            headers: {
              "x-token": token1,
              "Content-Type": "application/json"
            }
          });
        }

        expectRightsError(response, "addEmployeeToTeam");
      });

      it("addEmployeeToTeam - trying to add employee from different company to a team of our company via addEmployeeToTeam, expect failure", async () => {
        var query = `mutation{addEmployeeToTeam(employeeid:${user2Id}, teamid:${team1Id})}`;
        var response = await testing(queryWrapper(query), {
          headers: {
            "x-token": token1,
            "Content-Type": "application/json"
          }
        });

        if (response.success) {
          //removeEmployee if worked
          var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid:${team1Id}){ok}}`;
          var response1 = await testing(queryWrapper(query1), {
            headers: {
              "x-token": token1,
              "Content-Type": "application/json"
            }
          });
        }
        expectRightsError(response, "addEmployeeToTeam");
      });
    });
    describe("addEmployee:", () => {
      it("addEmployee - trying to add employee to company in which I am not an admin, expect failure - RightsError", async () => {
        var query = `mutation{addEmployee(unitid:${user1Id}, departmentid: ${team2Id}){ok}}`;
        var response = await testing(queryWrapper(query), {
          headers: {
            "x-token": token1,
            "Content-Type": "application/json"
          }
        });

        // remove the employee if illegal adding was successful
        if (response.success) {
          var query1 = `mutation{removeEmployee(unitid:${user1Id}, departmentid: ${team2Id}){ok}}`;
          var response1 = await testing(queryWrapper(query1), {
            headers: {
              "x-token": token2,
              "Content-Type": "application/json"
            }
          });
        }
        expectRightsError(response, "addEmployee");
      });
      it("addEmployee - trying to add employee from different company to a team of my company, expect failure - RightsError", async () => {
        var query = `mutation{addEmployee(unitid:${user2Id}, departmentid: ${team1Id}){ok}}`;
        var response = await testing(queryWrapper(query), {
          headers: {
            "x-token": token1,
            "Content-Type": "application/json"
          }
        });

        // remove the employee if illegal adding was successful
        if (response.success) {
          var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid: ${team1Id}){ok}}`;
          var response1 = await testing(queryWrapper(query1), {
            headers: {
              "x-token": token1,
              "Content-Type": "application/json"
            }
          });
        }

        expectRightsError(response, "addEmployee");
      });

      it("addEmployee - trying to add employee from different company to a team of company in which I am NOT an admin, expect failure - RightsError", async () => {
        var query = `mutation{addEmployee(unitid:${user2Id}, departmentid: ${team2Id}){ok}}`;
        var response = await testing(queryWrapper(query), {
          headers: {
            "x-token": token1,
            "Content-Type": "application/json"
          }
        });

        // remove the employee if illegal adding was successful
        if (response.success) {
          var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid: ${team2Id}){ok}}`;
          var response1 = await testing(queryWrapper(query1), {
            headers: {
              "x-token": token2,
              "Content-Type": "application/json"
            }
          });
        }

        expectRightsError(response, "addEmployee");
      });
    });

    it("trying to remove employee from a team which does not belong to my company via removeFromTeam, expect failure", async () => {
      var query = `mutation{removeFromTeam(teamid:${team2Id},userid:${user2Id},keepLicences:[])}`;
      var response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      if (response.success) {
        //addToTeam if removing worked
        var query1 = `mutation{addToTeam(userid:${user2Id}, teamid:${team2Id}, services: [])}`;
        var response1 = await testing(queryWrapper(query1), {
          headers: {
            "x-token": token2,
            "Content-Type": "application/json"
          }
        });
      }

      expectRightsError(response, "removeFromTeam");
    });

    it("deleteEmployee as admin from different company, expect failure - RightsError", async () => {
      var query = `mutation{deleteEmployee(employeeid:2099)}`;
      var response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "deleteEmployee");

      //check whether employee is still there
      query = `{fetchEmployees{employee{id}}}`;
      response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      successfulExecutionBase(response);
      expect(response.data.fetchEmployees).toContainObject({
        employee: {
          id: "2099"
        }
      });
    });

    it("updateEmployee as admin from different company, expect failure - RightsError", async () => {
      var query = `mutation{updateEmployee(user:{id:${user2Id}, firstname: \\"John\\"}){firstname}}`;
      var response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "updateEmployee");

      //check whether firstname is still Admin
      query = `{me{firstname lastname}}`;
      response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });
      successfulExecutionBase(response);
      expect(response.data.me.firstname).toEqual("Admin");
    });

    it("deleteTeam - trying to delete a team which is not in my company", async () => {
      var query = `mutation{deleteTeam(teamid:${team2Id})}`;
      var response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "deleteTeam");
    });
  });

  //fetches:
  describe("Fetching information:", () => {
    it("fetchSemiPublicUser - trying to fetch information about an employee from different company, expect failure - RightsError", async () => {
      const query = `{fetchSemiPublicUser(userid:${user2Id}){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "fetchSemiPublicUser");
    });

    it("fetchPublicUser - trying to fetch information about an employee from different company, expect success", async () => {
      const query = `{fetchPublicUser(userid:${user2Id}){firstname lastname isadmin}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      successfulExecutionBase(response);
      expect(response.errors).not.toBeDefined();
      expect(response.data.fetchPublicUser.firstname).toEqual("Admin");
      expect(response.data.fetchPublicUser.lastname).toEqual("Company2");
      expect(response.data.fetchPublicUser.isadmin).toEqual(true);
    });

    it("fetchTeam - trying to fetch information about team which is not in my company, expect failure - RightsError", async () => {
      const query = `{fetchTeam(teamid:${team2Id}){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "fetchTeam");
    });

    it("fetchTeams - trying to fetch information about the teams an employee is part of, expect failure - RightsError", async () => {
      const query = `{fetchTeams(userid:${user2Id}){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "fetchTeams");
    });

    it("fetchUsersOwnLicences - trying to fetch information about the licences of an employee, expect failure - RightsError", async () => {
      const query = `{fetchUsersOwnLicences(unitid:${user1Id}){key}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "fetchUsersOwnLicences");
    });

    it("fetchUserLicences - trying to fetch information about the licences of an employee, expect failure - RightsError", async () => {
      const query = `{fetchUserLicences(unitid:${user1Id}){key}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "fetchUserLicences");
    });

    it("fetchTempLicences - trying to fetch information about the temporary licences of an employee, expect failure - RightsError", async () => {
      const query = `{fetchTempLicences(unitid:${user1Id}){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "fetchTempLicences");
    });

    it("fetchIssuedLicences - trying to fetch information about the licences of an employee, expect failure - RightsError", async () => {
      const query = `{fetchIssuedLicences(unitid:${user1Id}){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "fetchIssuedLicences");
    });

    it("fetchUnitApps - trying to fetch information about the licences of an employee, expect failure - RightsError", async () => {
      const query = `{fetchUnitApps(departmentid:${team1Id}){appid}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "fetchUnitApps");
    });

    it("fetchUnitAppsSimpleStats - trying to fetch information about the licences of an employee, expect failure - RightsError", async () => {
      const query = `{fetchUnitAppsSimpleStats(departmentid:${team1Id}){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "fetchUnitAppsSimpleStats");
    });
  });

  describe("Phone manipulation:", () => {
    it("createPhone - trying to create phone for someone who does not belong to my company, expect failure - RightsError", async () => {
      const query = `mutation{createPhone(phoneData:{number: \\"0123456789\\"}, userid: ${user1Id}){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "createPhone");
    });

    it("updatePhone - trying to update the phone of someone who does not belong to my company, expect failure - RightsError", async () => {
      const query = `mutation{updatePhone(id:1, phone: {number: \\"1234\\"}, userid: ${user1Id}){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "updatePhone");
    });

    it("deletePhone - trying to delete the phone of someone who does not belong to my company, expect failure - RightsError", async () => {
      const query = `mutation{deletePhone(id:1, userid: ${user1Id}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "deletePhone");
    });
  });

  describe("Email manipulation:", () => {
    it("createEmail - trying to create email for someone who does not belong to my company, expect failure - RightsError", async () => {
      const query = `mutation{createEmail(emailData:{email: \\"randomemail@vipfy.store\\"}, userid: ${user1Id}){unitid{id} email}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "createEmail");
    });

    it("updateEmail - trying to update the email of someone who does not belong to my company, expect failure - RightsError", async () => {
      const query = `mutation{updateEmail(email: \\"keepthismail@vipfy.store\\", emailData:{priority: 0}, userid: ${user1Id}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "updateEmail");
    });

    it("updateEmail08 - trying to update the email of someone who does not belong to my company, expect failure - RightsError", async () => {
      const query = `mutation{updateEmail08(email: \\"keepthismail@vipfy.store\\", emailData:{priority: 0}, userid: ${user1Id}){email}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "updateEmail08");
    });

    it("deleteEmail - trying to delete the email of someone who does not belong to my company, expect failure - RightsError", async () => {
      const query = `mutation{deleteEmail(email: \\"keepthismail@vipfy.store\\", userid: ${user1Id}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "deleteEmail");
    });
  });

  describe("Try being Vipfy Admin:", () => {
    it("freezeAccount - try to freeze the account of someone, expect failure AdminError", async () => {
      const query = `mutation{freezeAccount(unitid:${user1Id}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      failedExecutionBase(response);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("AdminError");
      expect(response.data).toEqual(null);
    });

    it("adminDeleteUnit - try to delete the account of someone, expect failure AdminError", async () => {
      const query = `mutation{adminDeleteUnit(unitid:${user1Id}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      failedExecutionBase(response);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("AdminError");
      expect(response.data).toEqual(null);
    });

    it("adminUpdateUser - try to update the account of someone, expect failure AdminError", async () => {
      const query = `mutation{adminUpdateUser(user:{firstname: \\"Test\\"}, unitid:${user1Id}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      failedExecutionBase(response);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("AdminError");
      expect(response.data).toEqual(null);
    });

    it("createInvoice for someone not in my company, expect failure AdminError", async () => {
      const query = `mutation{createInvoice(unitid:${user1Id})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      failedExecutionBase(response);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("AdminError");
      expect(response.data).toEqual(null);
    });
  });

  describe("2FA:", () => {
    it("force2FA, expect failure - RightsError", async () => {
      const query = `mutation{force2FA(userid: ${user1Id})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "force2FA");
    });

    it("generateSecret for someone else, expect failure - RightsError", async () => {
      const query = `{generateSecret(type:yubikey, userid: ${user1Id}){qrCode}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "generateSecret");
    });

    it("verify2FA, expect failure - RightsError", async () => {
      const query = `mutation{verify2FA(userid: ${user1Id}, type: yubikey, code: \\"something\\", codeId: \\"sthelse\\")}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "verify2FA");
    });

    it("validate2FA, expect failure - RightsError", async () => {
      const query = `mutation{validate2FA(userid: ${user1Id}, type: yubikey, token: \\"asd\\", twoFAToken: \\"asd\\")}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "validate2FA");
    });
  });

  describe("App related:", () => {
    it("createOwnApp with userids of employees which do not belong to my company, expect failure - RightsError", async () => {
      const query = `mutation{createOwnApp(ssoData: {name: \\"App2\\", loginurl: \\"asd\\", email: \\"asd@asd.asd\\", password: \\"asd123asd\\", color: \\"#FF0000\\"}, userids: [${user1Id}, 2099]){id}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "createOwnApp");
    });

    it("addAppToTeam - add service to a team which does not belong to my company, expect failure - RightsError", async () => {
      const query = `mutation{addAppToTeam(serviceid: 428, teamid: ${team1Id}, employees: [])}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "addAppToTeam");
    });

    it("distributeLicence to someone who is not in my company, expect failure - RightsError", async () => {
      const query = `mutation{distributeLicence(licenceid:2582, unitid:${user1Id}, departmentid: ${team1Id}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "distributeLicence");
    });

    it("distributeLicence10 to someone who is not in my company, expect failure - RightsError", async () => {
      const query = `mutation{distributeLicence10(licenceid: 2582, userid: ${user1Id})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "distributeLicence10");
    });

    it("removeServiceFromTeam - trying to remove a service from team which does not belong to my company, expect failure - RightsError", async () => {
      const query = `mutation{removeServiceFromTeam(teamid: ${team1Id}, boughtplanid: 2567)}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "removeServiceFromTeam");
    });

    it("addExternalLicence - trying to add an external licence to an employee which is not in my company, expect failure - RightsError", async () => {
      const query = `mutation{addExternalLicence(username: \\"EL1user\\", password: \\"EL1pass\\", appid: 428, boughtplanid: \\"2549\\", touser: ${user2Id}){ok}}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "addExternalLicence");
    });

    it("addExternalAccountLicence - trying to add an external account licence to an employee which is not in my company, expect failure - RightsError", async () => {
      const query = `mutation{addExternalAccountLicence(username: \\"EAL1user\\", password: \\"EAL1pass\\", boughtplanid: \\"2549\\", touser: ${user2Id})}`;
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });

      expectRightsError(response, "addExternalAccountLicence");
    });
  });
});
