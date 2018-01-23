"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var types = exports.types = "\n# A company will be identified by it's id and get's a default Department after creation\n  type Company {\n    id: Int!\n    name: String!\n    companylogo: String\n    addresscountry: String\n    addressstate: String\n    addresscity: String\n    addressstreet: String\n    addressnumber: Int\n    family: Boolean\n  }\n\n# A department is a part of a company and is identified by an unique id\n  type Department{\n    id: Int!\n    name: String\n    companyid: Int\n    company: Company\n    addresscountry: String\n    addresscity: String\n    addressstate: String\n    addressstreet: String\n    addressnumber: Int\n  }\n";

var queries = exports.queries = "\n  allCompanies: [Company!]!\n  fetchCompany(id: Int!): Company!\n  allDepartments: [Department!]!\n  fetchDepartment(id: Int!): Department!\n  fetchDepartmentsByCompanyId(companyId: Int!): [Department!]\n";

var mutations = exports.mutations = "\n";