export const types = `
  input TeamInput {
    color: String
    leader: String
    icon: String
  }

  type Team {
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

  enum TEAMACTION {
    ADD
    REMOVE
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
  deleteTeam(teamid: ID!): Boolean!
  removeFromTeam(teamid: ID!, userid: ID!, keepLicences: [ID!]): Boolean!
  removeServiceFromTeam(teamid: ID!, serviceid: ID!, keepLicences: [ID!]): Boolean!
  addToTeam(userid: ID!, teamid: ID!, services: [SetupService]!): Boolean!
  addAppToTeam(serviceid: ID!, teamid: ID!, employees: [SetupService]!): Boolean!
  updateTeamMembers(members: [ID!]!, teamid: ID!, action: TEAMACTION!): Department!
  updateTeamInfos(teamid: ID!, data: TeamInput!): Department!
  addTeamLicence(teamid: ID!, boughtplanid: [ID!]!): Department!
`;
