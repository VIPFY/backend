export const types = `
  enum TWOFA_TYPE {
    yubikey
    totp
  }

  type QRCodeResponse {
    qrCode: String!
    codeId: ID!
  }
`;

export const queries = `
  generateSecret(type: TWOFA_TYPE!, userid: ID): QRCodeResponse!
`;

export const mutations = `
  validateToken(userid: ID!, type: TWOFA_TYPE!, token: String!): Boolean!
  verifyToken(userid: ID!, type: TWOFA_TYPE!, code: String!, codeId: ID!): Boolean!
`;
