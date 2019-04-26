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
    employees: Int
    employeedata: [PublicUser]!
    managelicences: Boolean
    apps: JSON
    domains: [Domain]
    licences: JSON
    services: JSON
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
`;

export const queries = `
  fetchTeams(userid: ID!): [Team]
`;

export const mutations = `
  addTeam(name: String!, data: TeamInput!): Department!
  deleteTeam(teamid: ID!): Boolean!
  updateTeamMembers(members: [ID!]!, teamid: ID!, action: TEAMACTION!): Department!
  updateTeamInfos(teamid: ID!, data: TeamInput!): Department!
  addTeamLicence(teamid: ID!, boughtplanid: [ID!]!): Department!
`;
