export const types = `
# This three sexes are possible
  enum SEX {
    m,
    w,
    u
  }

# An user must have one of these stati
  enum USER_STATUS {
    toverify,
    normal,
    banned,
    onlynews
  }

# Custom Scalar Date
  scalar Date

# Custom Scalar JSON
  scalar JSON

type Newsletter {
  email: Email!
  activesince: String!
  activeuntil: String
}
`;

export const mutations = `
# Sends an email from an user to office@vipfy.com
  newContactEmail(name: String!, email: String!, phone: String, message: String): Response!
`;
