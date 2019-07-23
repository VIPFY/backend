export const types = `
  enum TWOFA_TYPE {
    yubikey
    totp
  }
`;

export const queries = `
generateSecret(type: TWOFA_TYPE!): String!
`;

export const mutations = `
  validateToken(unitid: ID!, type: String!, token: String!): Boolean!
  verifyToken(type: String!, code: String!): Boolean!
`;
