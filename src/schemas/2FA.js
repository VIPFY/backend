export const types = `
  enum TWOFA_TYPE {
    yubikey
    totp
  }

  type Yubikey {
    rp: JSON!
    user: JSON!
    pubKeyCredParams: [JSON]!
    attestation: String!
    timeout: Int!
    challenge: [String]
  }

  type TwoFactorResponse {
    qrCode: String
    codeId: ID
    yubikey: Yubikey
  }
`;

export const queries = `
  generateSecret(type: TWOFA_TYPE!, userid: ID): TwoFactorResponse!
`;

export const mutations = `
  force2FA(userid: ID!): Boolean!
  validate2FA(userid: ID!, type: TWOFA_TYPE!, token: String!): String!
  verify2FA(userid: ID!, type: TWOFA_TYPE!, code: String!, codeId: ID!): Boolean!
`;
