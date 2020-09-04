export const types = `
  input TeamInput {
    color: String
    leader: String
    icon: String
  }

  type PublicTeam {
    id: ID!
    name: String!
    profilepicture: String
    iscompany: Boolean
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
    services: [Orbit]
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
  fetchTeamName(teamid: ID!): String  @deprecated(reason: "Use fetchPublicTeam")
  fetchPublicTeam(teamid: ID!): PublicTeam
  `;

export const mutations = `
  createTeam(team: JSON!, addemployees: [JSON]!, apps: [JSON]!): ID!
  deleteTeam(teamid: ID!, deletejson: JSON, endtime: Date): Boolean!
  updateTeamPic(file: Upload!, teamid: ID!): Team!

  addOrbitToTeam(teamid: ID!, orbitid: ID!, assignments: JSON): Team
  addMemberToTeam(teamid: ID!, employeeid: ID!, assignments: JSON): Team
  removeTeamOrbitFromTeam(teamid: ID!, orbitid: ID!, deletejson: JSON, endtime: Date): Team
  removeMemberFromTeam(teamid: ID!, userid: ID!, deletejson: JSON, endtime: Date): Team
`;
