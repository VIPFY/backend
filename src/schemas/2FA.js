export const types = `
  enum TWOFA_TYPE {
    yubikey
    totp
  }
`;

export const mutations = `
  generateSecret(type: TWOFA_TYPE!): Boolean!
  validateToken(unitid: ID!, type: String!, token: String!): Boolean!
`;
