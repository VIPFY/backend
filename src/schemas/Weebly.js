export const types = `
  # Response from Weebly
  type WeeblyResponse {
    ok: Boolean!
    loginLink: String
  }
`;

export const mutations = `
  # Creates an user, a site with a plan and generates a loginlink
  weeblyCreateLoginLinkNewUser(email: String!, boughtplanid: Int!, domain: String!, plan: Int!): WeeblyResponse!

  weeblyCreateLoginLink(licenceid: Int!): WeeblyResponse!
`;
