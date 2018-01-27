export const types = `
  # Response from Weebly
  type WeeblyResponse {
    ok: Boolean!
    error: String
    loginLink: String
  }
`;

export const mutations = `
  # Creates an user, a site with a plan and generates a loginlink
  weeblyCreateLoginLink(email: String!, agb: Boolean!, domain: String!, plan: Int!): WeeblyResponse!
`;
