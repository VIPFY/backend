import { tester } from "graphql-tester";
import { request } from "request";

const testing = tester({
  url: "https://api.dev.vipfy.store/graphql",
  method: "POST",
  contentType: "application/json"
  
});

// Implements expect(array).toContainObject(argument), checks whether an array contains the object given as argument
expect.extend({
  toContainObject(received, argument) {

    const pass = this.equals(received, 
      expect.arrayContaining([
        expect.objectContaining(argument)
      ])
    )

    if (pass) {
      return {
        message: () => (`expected ${this.utils.printReceived(received)} not to contain object ${this.utils.printExpected(argument)}`),
        pass: true
      }
    } else {
      return {
        message: () => (`expected ${this.utils.printReceived(received)} to contain object ${this.utils.printExpected(argument)}`),
        pass: false
      }
    }
  }
})

const queryWrapper = function(query) {
  return '{"operationName":null,"variables":{},"query":"' + query + '"}';
};

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function successfulExecution(response){
  expect(response).toBeDefined();
  expect(response.status).toEqual(200);
  expect(response.success).toEqual(true);
  expect(response.errors).not.toBeDefined();
}

describe("Testing the creation of an app", () => {
  var token;
  var appName, appId, companyId, companyName, loginUrl;

  //Sign in and set the token to the test user named Test User from Company IntegrationTests
  it("signing in, expect success", async () => {
    const query =
      'mutation{signIn(email:\\"testmail147@abv.bg\\", password: \\"testPass123\\"){token}}';
    const response = await testing(queryWrapper(query));
    
    successfulExecution(response); 
    expect(response.data.signIn.token).toBeDefined();
    token = response.data.signIn.token;
  });

  it("fetch app info via fetchAppById, expect success", async () => {
    const query = `{fetchAppById(id:425){id name developername loginurl developer{id}}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    successfulExecution(response);
    expect(response.data.fetchAppById.id).toBeDefined();
    appId = response.data.fetchAppById.id;
    expect(response.data.fetchAppById.name).toBeDefined();
    appName = response.data.fetchAppById.name;
    expect(response.data.fetchAppById.developername).toBeDefined();
    companyName = response.data.fetchAppById.developername;
    expect(response.data.fetchAppById.loginurl).toBeDefined();
    loginUrl = response.data.fetchAppById.loginurl;
    expect(response.data.fetchAppById.developer.id).toBeDefined();
    companyId = response.data.fetchAppById.developer.id;
  });

  it("fetchUserLicences, expect success", async () => {
    const query = `{fetchUserLicences(unitid:1211){id}}`;
    const response = await testing(queryWrapper(query), {
      headers: {
        "x-token": token,
        "Content-Type": "application/json"
      }
    });

    successfulExecution(response);
    expect(response.data.fetchUserLicences).toEqual(expect.arrayContaining([expect.objectContaining({"id":"2582"})]));
    expect(response.data.fetchUserLicences).toContainObject({"id":"2583"});
  });


  //TODO: Write tests for queries from app.js (queries)
  //allApps
  //fetchAllAppsEnhanced
  //fetchAppById
  //fetchLicences
  //fetchUsersOwnLicences
  //fetchUnitApps
  //fetchUnitAppsSimpleStats
  //fetchSupportToken
  //fetchAppIcon
  //fetchBoughtplanUsagePerUser
  //fetchMonthlyAppUsage
  //fetchCompanyServices
  //fetchCompanyService
  //fetchServiceLicences
  //fetchTotalAppUsage
  //fetchIssuedLicences
  //fetchTempLicences
  //bulkUpdateLayout
  


  //TODO: Write tests for Licence manipulation from app.js (mutations)
  //distributeLicenceToDepartment
  //revokeLicencesFromDepartment
  //distributeLicence
  //revokeLicence
  //agreeToLicence
  //trackMinutesSpent
  //addExternalBoughtPlan
  //addExternalLicence
  //suspendLicence
  //clearLicence
  //deleteServiceLicenceAt
  //deleteLicenceAt
  //deleteBoughtPlanAt
  //updateCredentials
  //updateLayout
  //createOwnApp
  //giveTemporaryAccess
  //deleteService
  //updateTemporaryAccess
  //removeLicence
  //distributeLicence10
  //removeTemporaryAccess
  //addExternalAccountLicence
  

});
