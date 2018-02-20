export const types = `
# The basic Response
  type Response {
    ok: Boolean!
  }

# Contains the changed rating
  type ReviewResponse {
    ok: Boolean!
    balance: Int
    id: Int
  }

# Contains the id of the Message
  type MessageResponse {
    ok: Boolean!
    message: String
    id: Int
  }

# If the registration was successful, a boolean will be given back
  type RegisterResponse {
    ok: Boolean!
    token: String
    refreshToken: String
  }

# The user receives tokens upon a successful login
  type LoginResponse {
    ok: Boolean!
    token: String
    refreshToken: String
    user: Unit!
  }

# The user gets the email where the new auth is send back
 type ForgotPwResponse {
   ok: Boolean!
   email: String
 }

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

type Newsletter {
  email: Email!
  activesince: String!
  activeuntil: String
}

# Custom options for an object
  type Options {
    a: String
  }

  type Restrictions {
    a: String

  }
`;

export const mutations = `
# Sends an email from an user to office@vipfy.com
  newContactEmail(name: String!, email: String!, phone: String, message: String): Response!
`;
