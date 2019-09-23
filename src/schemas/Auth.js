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
  }
`;

export const queries = `
  #The token the user receives after registration to set his password
  checkAuthToken(token: String!, email: String!): TokenResponse!
  
  # Fetches all Sessions of a specific User
  fetchUsersSessions(userid: ID!): [SessionResponse!]!
`;

export const mutations = `
  # Only an email is required for the signup
  signUp(email: String!, companyname: String!, privacy: Boolean!, termsOfService: Boolean!, isprivate: Boolean): RegisterResponse!
  # After confirming the email, an user has to set a password
  signUpConfirm(email: String!, password: String!, passwordConfirm: String!, token: String!): SignUpConfirmResponse!

  signIn(email: String!, password: String!): LoginResponse!
  signOut: Boolean!
  signOutSession(sessionID: String!): [SessionResponse!]!
  signOutUser(sessionID: String!, userid: ID!): [SessionResponse!]!
  signOutEverywhere: Boolean!
  signOutUserEverywhere(userid: ID!): Boolean!

  # Let an active user change his password
  changePassword(pw: String!, newPw: String!, confirmPw: String): LoginResponse!

  # Send the user a new link for sign up
  forgotPassword(email: String!): ForgotPwResponse!

  impersonate(userid: ID!): String!
  endImpersonation(token: String!): String!
`;