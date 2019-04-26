export const types = `
  input TeamInput {
    color: String
    leader: String
    icon: String
  }

  enum TEAMACTION {
    ADD
    REMOVE
  }
`;

export const mutations = `
  addTeam(name: String!, data: TeamInput!): Department!
  deleteTeam(teamid: ID!): Boolean!
  updateTeamMembers(members: [ID!]!, teamid: ID!, action: TEAMACTION!): Department!
  updateTeamInfos(teamid: ID!, data: TeamInput!): Department!
  addTeamLicence(teamid: ID!, boughtplanid: [ID!]!): Department!
`;
