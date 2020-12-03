export const types = `
  type SignUpConfirmResponse {
    download: DownloadLink
  }

  type Location {
    city: String
    country: String
  }

  type SessionResponse {
    id: String!
    system: String
    location: Location
    loggedInAt: Date!
    host: String
  }

  type PasswordParams {
    id: ID!
    salt: String!
    ops: Int!
    mem: Int!
  }

  type RecoveryChallenge {
    encryptedKey: String!
    publicKey: String!
    token: String!
  }

  type Key {
    id: ID!
    unitid: PublicUser!
    privatekey: String!
    publickey: String!
    createdat: Date!
    encryptedby: [Key]
  }

  input KeyInput {
    id: ID
    unitid: ID
    privatekey: String
    publickey: String
    encryptedby: String
  }

  input PasswordMetricsInput {
    passwordlength: Int!
    passwordstrength: Int!
  }

  input RecoveryKeyInput {
    privatekey: String!
    publickey: String!
    encryptedby: String
  }

  input PasswordRecoveryInput {
    email: String!
    secret: String!
    token: String!
    recoveryPrivateKey: String!
    newPasskey: String!
    passwordMetrics: PasswordMetricsInput!
    newKey: KeyInput!
    replaceKeys: [KeyInput!]!
  }

  type RecoveryResponse {
    token: String!
    currentKey: RecoveryKey
    config: JSON
  }

  type RecoveryKey {
    id: ID!
    unitid: PublicUser!
    privatekey: String!
    publickey: String!
    createdat: Date!
  }
`;

export const queries = `
  #The token the user receives after registration to set his password
  checkAuthToken(token: String!): TokenResponse!
  
  # Fetches all Sessions of a specific User
  fetchUsersSessions(userid: ID!): [SessionResponse!]!

  fetchRecoveryChallenge(email: String!): RecoveryChallenge!
  fetchPwParams(email: String!): PasswordParams!
  fetchKey(id: ID!): Key
  fetchKeys(publickey: ID!): [Key]
  fetchCurrentKey(unitid: ID): Key
`;

export const mutations = `
  # Only an email is required for the signup
  signUp(email: String!, companyname: String, privacy: Boolean!, termsOfService: Boolean!, isprivate: Boolean, passkey: String!, passwordMetrics: PasswordMetricsInput!, personalKey: KeyInput!, adminKey: KeyInput!, passwordsalt: String!, improve: Boolean): RegisterResponse!
  # After confirming the email, an user has to set a password
  signUpConfirm(token: String!): SignUpConfirmResponse!
  signIn(email: String!, password: String, passkey: String): LoginResponse!
  signOut: Boolean!
  signOutSession(sessionID: String!): [SessionResponse!]!
  signOutUser(sessionID: String!, userid: ID!): [SessionResponse!]!
  signOutEverywhere(userid: ID!): Boolean!

  saveRecoveryKey(keyData: RecoveryKeyInput): User!
  recoverPassword(token: String!, secret: String!, email: String!): RecoveryResponse!

  # Let an active user change his password
  changePassword(pw: String!, newPw: String!, confirmPw: String): LoginResponse!
  changePasswordEncrypted(oldPasskey: String!, newPasskey: String!, recoveryPrivateKey: String, passwordMetrics: PasswordMetricsInput!, newKey: KeyInput!, replaceKeys: [KeyInput!]!): LoginResponse!
  updateRecoveredPassword(recoveryData: PasswordRecoveryInput!): String!

  impersonate(userid: ID!): String!
  endImpersonation(token: String!): String!
`;
