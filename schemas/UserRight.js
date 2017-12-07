export const types = `
# Every user has a set of rights which handles his access to different parts of Vipfy
type UserRight {
  companyid: Int!
  departmentid: Int!
  userid: Int!
  userright: Int!
  user: User!
}
`;

export const queries = `
# Shows all User rights
allUserRights: [UserRight!]!
# Shows all the rights an user has
fetchUserRights(userid: Int!): [UserRight!]
`;
