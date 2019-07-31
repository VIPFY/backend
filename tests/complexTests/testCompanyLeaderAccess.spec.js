import { tester } from "graphql-tester";
import { request } from "request";

const testing = tester({
  //url: "http://backend-dev2.eu-central-1.elasticbeanstalk.com/graphql",
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

function successfulExecutionBase(response){
  expect(response).toBeDefined();
  expect(response.status).toEqual(200);
  expect(response.success).toEqual(true);
}

function failedExecutionBase(response){
  expect(response).toBeDefined();
  expect(response.status).toEqual(200);
  expect(response.success).toEqual(false);
}

/*
 *  Testing company admin access restrictions
 */

describe("Testing company admin access restrictions", () => {
  var token1, token2;
  var user1Id, user2Id;
  var team1Id, team2Id;

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

  it("Test companies names, expect succcess", async () => {
    var query = '{fetchCompany{name}}';
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
    console.log("TCL: response", response)

    successfulExecutionBase(response);
    expect(response.data.fetchCompany.name).toBeDefined();
    expect(response.data.fetchCompany.name).toEqual("TestCompany");

  });

  it("get general data(user IDs, team IDs), expect success", async () => {
    var query = '{me{id}}';
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

    query = '{fetchCompanyTeams{id}}';
    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });
    expect(response.data.fetchCompanyTeams[0].id).toBeDefined();
    team1Id = response.data.fetchCompanyTeams[0].id;

    response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token2,
        "Content-Type": "application/json"
      }
    });
    expect(response.data.fetchCompanyTeams[0].id).toBeDefined();
    team2Id = response.data.fetchCompanyTeams[0].id;
    
  });

  it("trying to add employee which is NOT in current company to team which is NOT in current company via addToTeam, expect failure", async () => {
    const query = `mutation{addToTeam(userid:${user2Id}, teamid:${team2Id}, services: [])}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("NormalError");
  });

  it("trying to add employee to a team which is NOT in current company via addToTeam, expect failure", async () => {
    const query = `mutation{addToTeam(userid:${user2Id}, teamid:${team1Id}, services: [])}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token2,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
  });

  it("trying to add employee from different company to a team of our company via addToTeam, expect failure", async () => {
    var query = `mutation{addToTeam(userid:${user2Id}, teamid:${team1Id}, services: [])}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    if(response.success) {
      //removeEmployee if worked
      var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid:${team1Id}){ok}}`;
      var response1 = await testing(queryWrapper(query1), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });
    } 
    expect(response.success).toEqual(false);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
  });

  

  it("trying to add employee which is NOT in current company to a team which is NOT in current company via addEmployeeToTeam, expect failure", async () => {
    const query = `mutation{addEmployeeToTeam(employeeid:${user2Id}, teamid:${team2Id})}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
  });

  it("trying to add employee to team which is NOT in current company via addEmployeeToTeam, expect failure", async () => {
    const query = `mutation{addEmployeeToTeam(employeeid:${user2Id}, teamid:${team1Id})}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token2,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
  });

  it("trying to add employee from different company to a team of our company via addEmployeeToTeam, expect failure", async () => {
    var query = `mutation{addEmployeeToTeam(employeeid:${user2Id}, teamid:${team1Id})}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    if(response.success) {
      //removeEmployee if worked
      var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid:${team1Id}){ok}}`;
      var response1 = await testing(queryWrapper(query1), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });
    } 
    expect(response.success).toEqual(false);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
  });

  it("addEmployee - trying to add employee to company in which I am not an admin, expect failure - RightsError", async () => {
    var query = `mutation{addEmployee(unitid:${user1Id}, departmentid: ${team2Id}){ok}}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    // remove the employee if illegal adding was successful
    if(response.success){
      var query1 = `mutation{removeEmployee(unitid:${user1Id}, departmentid: ${team2Id}){ok}}`;
      var response1 = await testing(queryWrapper(query1), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });
    }
    expect(response.success).toEqual(false);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
  });

  it("addEmployee - trying to add employee from different company to a team of my company, expect failure - RightsError", async () => {
    var query = `mutation{addEmployee(unitid:${user2Id}, departmentid: ${team1Id}){ok}}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    // remove the employee if illegal adding was successful
    if(response.success){
      var query1 = `mutation{removeEmployee(unitid:${user2Id}, departmentid: ${team1Id}){ok}}`;
      var response1 = await testing(queryWrapper(query1), {
        headers: {
          "x-token": token1,
          "Content-Type": "application/json"
        }
      });
    }
    expect(response.success).toEqual(false);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
  });

  // TODO
  /*it("addEmployee - trying to add employee from different company to a team of company in which I am NOT an admin, expect failure - RightsError", async () => {
    
  });*/

  //BUG: removeEmployee allows an admin from different company to remove employees from teams of current company
  it("trying to remove employee from a team which does not belong to my company via removeEmployee, expect failure", async () => {
    var query = `mutation{removeEmployee(unitid:${user2Id}, departmentid:${team2Id}){ok}}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    if(response.success) {
      //addToTeam if removing worked
      var query1 = `mutation{addToTeam(userid:${user2Id}, teamid:${team2Id}, services: [])}`;
      var response1 = await testing(queryWrapper(query1), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });
    }
    expect(response.success).toEqual(false);
    expect(response.errors).toBeDefined();
    expect(response.errors[0].name).toEqual("RightsError");
  });

  it("trying to remove employee from a team which does not belong to my company via removeFromTeam, expect failure", async () => {
    var query = `mutation{removeFromTeam(teamid:${team2Id},userid:${user2Id},keepLicences:[])}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    if(response.success) {
      //addToTeam if removing worked
      var query1 = `mutation{addToTeam(userid:${user2Id}, teamid:${team2Id}, services: [])}`;
      var response1 = await testing(queryWrapper(query1), {
        headers: {
          "x-token": token2,
          "Content-Type": "application/json"
        }
      });
    }
    expect(response.success).toEqual(false);
    expect(response.errors).toBeDefined();
    expect(response.errors[0].name).toEqual("RightsError");
  });

  it("fetchTeam - trying to fetch information about team which is not in my company, expect failure - RightsError", async () => {
    const query = `{fetchTeam(teamid:${team2Id}){id}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
    expect(response.data).toEqual(null);
  });

  it("fetchTeams - trying to fetch information about the teams an employee is part of, expect failure - RightsError", async () => {
    const query = `{fetchTeams(userid:${user2Id}){id}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
    expect(response.data).toEqual(null);
  });

  it("fetchSemiPublicUser - trying to fetch information about an employee from different company, expect failure - RightsError", async () => {
    const query = `{fetchSemiPublicUser(unitid:${user2Id}){id}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
    expect(response.data).toEqual(null);
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

  it("forcePasswordChange as admin from different company, expect failure - RightsError", async () => {
    const query = `mutation{forcePasswordChange(userids:[${user2Id}]){ok}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
    expect(response.data).toEqual(null);
  });

  it("changeAdminStatus as admin from different company, expect failure - RightsError", async () => {
    const query = `mutation{changeAdminStatus(unitid:${user2Id}, admin:false){id status}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
    expect(response.data).toEqual(null);
  });

  it("banEmployee as admin from different company, expect failure - RightsError", async () => {
    const query = `mutation{banEmployee(userid:${user2Id}){ok}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
    expect(response.data).toEqual(null);
  });

  it("unbanEmployee as admin from different company, expect failure - RightsError", async () => {
    const query = `mutation{unbanEmployee(userid:${user2Id}){ok}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
    expect(response.data).toEqual(null);
  });

  //TODO: Remove comments later!
  /*it("addCreateEmployee - trying to add new employee to a team which does not belong to my company, expect failure - RightsError", async () => {
    var random = getRandomInt(999999);

    const query = `mutation{addCreateEmployee(email: \\"newemp${random}@vipfy.store\\", password: \\"empPass123\\", name: {title: \\"\\", firstname: \\"Employee\\", middlename: \\"\\", lastname: \\"Two\\", suffix: \\"\\"}, departmentid: ${team2Id} ){ok}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(false);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
    expect(response.data).toEqual(null);
  });*/

  //TODO: deleteEmployee
  /*it("deleteEmployee as admin from different company, expect failure - RightsError", async () => {
    const query = `mutation{deleteEmployee(employeeid:${user2Id})}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
    expect(response.data).toEqual(null);
  });*/
  //TODO: fireEmployee
  //TODO: updateEmployee
  /*it("updateEmployee as admin from different company, expect failure - RightsError", async () => {
    const query = `mutation{updateEmployee(user:{id:${user2Id}, firstname: \\"John\\"}){firstname}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    expect(response).toBeDefined();
    expect(response.status).toEqual(200);
    expect(response.success).toEqual(false);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
    expect(response.data).toEqual(null);
  });*/


  it("trying to delete a team which is not in my company", async () => {
    var query = `mutation{deleteTeam(teamid:${team2Id})}`;
    var response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token1,
        "Content-Type": "application/json"
      }
    });

    failedExecutionBase(response);
    expect(response.errors).toHaveLength(1);
    expect(response.errors[0].name).toEqual("RightsError");
  });
});
