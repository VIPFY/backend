import { tester } from "graphql-tester";
import { decode } from "jsonwebtoken";

const testing = tester({
  url: "https://api.dev.vipfy.store/graphql",
  method: "POST",
  contentType: "application/json"
});

const queryWrapper = function(query) {
  return '{"operationName":null,"variables":{},"query":"' + query + '"}';
};

describe("Testing app queries with token", () => {
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

  it("allApps - query all fields of AppDetails, expect success", async () => {
    const query =
      "{allApps{id name developer{id profilepicture createdate} developername icon logo images loginurl website description teaserdescription needssubdomain features options avgstars disabled cheapestprice cheapestpromo supportunit{id profilepicture createdate} supportphone supportwebsite color hidden owner{id profilepicture createdate}}}";
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
  });

  it("fetchAllAppsEnhanced - query all fields of App, expect success", async () => {
    const query =
      "{fetchAllAppsEnhanced{id name icon loginurl description teaserdescription needssubdomain website disabled logo images features options developer{id profilepicture createdate} supportunit{id profilepicture createdate} color deprecated hidden hasboughtplan owner{unitid{id} name employees legalinformation banned deleted suspended profilepicture employeedata{id}}}}";
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
  });

  it("fetchAppById - query all fields of AppDetails, expect success", async () => {
    const query =
      "{fetchAppById(id:425){id name developer{id profilepicture createdate} developername icon logo images loginurl website description teaserdescription needssubdomain features options avgstars disabled cheapestprice cheapestpromo supportunit{id profilepicture createdate} supportphone supportwebsite color hidden owner{id profilepicture createdate}}}";
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
  });

  it("fetchLicences - query all fields of Licence, expect success", async () => {
    const query =
      "{fetchLicences(licenceid: 2582){id options starttime endtime agreed disabled pending key boughtplanid{id buytime alias endtime description key buyer{id createdate profilepicture} payer{id createdate profilepicture} usedby{id createdate profilepicture} planid{id} licences{id} totalprice} unitid{id} dashboard sidebar view edit delete use vacationstart vacationend tags teamlicence{id} teamaccount{id}}}";
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
  });

  it("fetchUsersOwnLicences - query all fields of Licence, expect success", async () => {
    const query =
      "{fetchUsersOwnLicences(unitid:1211){id options starttime endtime agreed disabled pending key boughtplanid{id buytime alias endtime description key buyer{id createdate profilepicture} payer{id createdate profilepicture} usedby{id createdate profilepicture} planid{id} licences{id} totalprice} unitid{id} dashboard sidebar view edit delete use vacationstart vacationend tags teamlicence{id} teamaccount{id}}}";
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
  });

  it("fetchUserLicences - query all fields of Licence, expect success", async () => {
    const query =
      "{fetchUserLicences(unitid:1211){id options starttime endtime agreed disabled pending key boughtplanid{id buytime alias endtime description key buyer{id createdate profilepicture} payer{id createdate profilepicture} usedby{id createdate profilepicture} planid{id} licences{id} totalprice} unitid{id} dashboard sidebar view edit delete use vacationstart vacationend tags teamlicence{id} teamaccount{id}}}";
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
  });

  it("fetchUnitApps - query all fields of AppBoughtPlanResponse, expect success", async () => {
    const query =
      "{fetchUnitApps(departmentid:1453){id usedby{id profilepicture createdate} boughtplan{id buytime alias endtime description key buyer{id profilepicture createdate} payer{id profilepicture createdate} usedby{id profilepicture createdate} planid{id name} licences{id} totalprice} description appid appname appicon applogo licencesused licencestotal endtime}}";
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
  });

  it("fetchUnitAppsSimpleStats - query all fields of SimpleStats, expect success", async () => {
    const query =
      "{fetchUnitAppsSimpleStats(departmentid: 1453){id usedby{id createdate profilepicture} boughtplan{id} minutestotal minutesavg mintesmedian minutesmin minutesmax}}";
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
  });

  it("fetchSupportToken, expect success", async () => {
    const query = "{fetchSupportToken}";
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
    var decodedToken = decode(response.data.fetchSupportToken);
    expect(decodedToken.name).toEqual("Test User");
    expect(decodedToken.email).toEqual("testmail147@abv.bg");
  });

  /*TODO:
  it("fetchBoughtplanUsagePerUser - query all fields of BoughtplanUsagePerUser, expect success", async () => {
    var query = `{"operationName":\"onFetchBoughtplanUsagePerUser\","variables":{"starttime":\"2018-12-3\","endtime":\"2019-12-3\","boughtplanid":2547},"query":"query onFetchBoughtplanUsagePerUser($starttime: Date!, $endtime: Date!, $boughtplanid: ID!) {  fetchBoughtplanUsagePerUser(starttime: $starttime, endtime: $endtime, boughtplanid: $boughtplanid) {boughtplan{id buytime alias endtime description key} unit{id firstname middlename lastname title sex birthday language profilepicture isadmin companyban isonline} totalminutes licenceenddates}}"}`;
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
  });*/

  it("fetchTotalAppUsage - query all fields of AppUsage, expect success", async () => {
    const query =
      "{fetchTotalAppUsage{app{id name icon loginurl description teaserdescription needssubdomain website disabled logo images features options developer{id createdate profilepicture} supportunit{id createdate profilepicture} color deprecated hidden hasboughtplan owner{unitid{id} name legalinformation banned deleted suspended profilepicture employees employeedata{id} managelicences apps domains{id} createdate promocode setupfinished iscompany isprivate internaldata}} options totalminutes}}";
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
  });

  it("fetchCompanyServices - query all fields of CompanyService, expect success", async () => {
    const query =
      "{fetchCompanyServices{id app{id name developername icon loginurl needssubdomain logo description teaserdescription website images features options disabled avgstars cheapestprice cheapestpromo supportwebsite supportphone developerwebsite supportunit{id createdate profilepicture} developer{id createdate profilepicture} owner{id createdate profilepicture} hidden color} licences{id options starttime endtime agreed disabled pending key boughtplanid{id} unitid{id} sidebar dashboard view edit delete use vacationstart vacationend tags teamlicence{id} teamaccount{id} } teams{departmentid{unitid{id}} boughtplanid{id}}}}";
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
  });

  it("fetchCompanyService - query all fields of CompanyService, expect success", async () => {
    const query =
      "{fetchCompanyService(serviceid:2549){id app{id name developername icon loginurl needssubdomain logo description teaserdescription website images features options disabled avgstars cheapestprice cheapestpromo supportwebsite supportphone developerwebsite supportunit{id createdate profilepicture} developer{id createdate profilepicture} owner{id createdate profilepicture} hidden color} licences{id options starttime endtime agreed disabled pending key boughtplanid{id} unitid{id} sidebar dashboard view edit delete use vacationstart vacationend tags teamlicence{id} teamaccount{id} } teams{departmentid{unitid{id}} boughtplanid{id}}}}";
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
  });

  it("fetchServiceLicences - query all fields of ServiceLicence, expect success", async () => {
    const query =
      "{fetchServiceLicences(employees: [1211], serviceid: 2549){id licence{id} starttime endtime agreed alias}}";
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
  });

  it("fetchIssuedLicences - query all fields of TempLicence, expect success", async () => {
    const query =
      "{fetchIssuedLicences(unitid:1211){id licenceid{id starttime endtime options boughtplanid{id} unitid{id} pending dashboard sidebar tags} view edit delete use starttime endtime unitid{id} owner{id} tags}}";
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
  });

  it("fetchIssuedLicences - query all fields of TempLicence, expect success", async () => {
    const query =
      "{fetchIssuedLicences(unitid:1211){id licenceid{id starttime endtime options boughtplanid{id} unitid{id} pending dashboard sidebar tags} view edit delete use starttime endtime unitid{id} owner{id} tags}}";
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
  });

  it("fetchTempLicences - query all fields of TempLicence, expect success", async () => {
    const query =
      "{fetchTempLicences(unitid:1211){id licenceid{id starttime endtime options boughtplanid{id} unitid{id} pending dashboard sidebar tags} view edit delete use starttime endtime unitid{id} owner{id} tags}}";
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
  });

  //TODO: bulkUpdateLayout
});
