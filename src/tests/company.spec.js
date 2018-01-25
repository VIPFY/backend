import { executeQuery, testDefault, handleTestDatabase } from "./helper";
import { dummyCompany } from "./dummies";
import { allCompanies } from "./queries";

handleTestDatabase();

const tests = [
  {
    description: "allCompanies should fetch all companies",
    operation: allCompanies,
    name: "allCompanies",
    dummy: dummyCompany,
    arrayTest: true
  }
];

describe("Query ", () => tests.map(test => testDefault(test)));
