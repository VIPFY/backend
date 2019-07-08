export const types = `
  enum TWOFA_TYPE {
    yubikey
    totp
  }
`;

export const mutations = `
  generateSecret: Boolean!
  generateToken(type: TWOFA_TYPE!): String!
  validateToken(token: String!): Boolean!
`;
