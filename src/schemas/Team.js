export const types = `
  input TeamInput {
    color: String
    leader: String
    icon: String
  }

  type Team {
    id: ID!
    name: String!
    legalinformation: JSON
    unitid: Unit!
    banned: Boolean!
    deleted: Boolean!
    suspended: Boolean!
    profilepicture: String
    employees: [SemiPublicUser]
    employeenumber: Int
    managelicences: Boolean
    apps: JSON
    domains: [Domain]
    licences: [Licence]
    services: [BoughtPlan]
    createdate: String!
    promocode: String
    setupfinished: Boolean
    iscompany: Boolean
    internaldata: JSON
  }

  input SetupService {
    id: ID!
    setup: JSON
    setupfinished: Boolean!
  }
`;

export const queries = `
  fetchTeams(userid: ID!): [Team]
  fetchCompanyTeams: [Team]
  fetchTeam(teamid: ID!): Team
`;

export const mutations = `
  addTeam(name: String!, data: TeamInput!): Department!
  createTeam(team: JSON!, addemployees: [JSON]!, apps: [JSON]!): ID!
  deleteTeam(teamid: ID!, keepLicences: [JSON!]): Boolean!
  removeFromTeam(teamid: ID!, userid: ID!, keepLicences: [ID!]): Boolean!
  removeServiceFromTeam(teamid: ID!, boughtplanid: ID!, keepLicences: [ID!]): Boolean!
  addToTeam(userid: ID!, teamid: ID!, services: [SetupService]!, newEmployeeInfo: JSON, newTeam: JSON): Boolean!
  addEmployeeToTeam(employeeid: ID!, teamid: ID!): Boolean!
  addAppToTeam(serviceid: ID!, teamid: ID!, employees: [SetupService]!): Boolean!
  updateTeamPic(file: Upload!, teamid: ID!): Team!
`;
