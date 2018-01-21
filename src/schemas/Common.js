export const types = `
# The basic Response
  type Response {
    ok: Boolean!
    error: String
  }

# Contains the changed rating
  type ReviewResponse {
    ok: Boolean!
    error: String
    balance: Int
    id: Int
  }

# Contains the id of the Message
  type MessageResponse {
    ok: Boolean!
    message: String
    id: Int
    error: String
  }

# If the registration was successful, a boolean will be given back
  type RegisterResponse {
    ok: Boolean!
    error: String
    token: String
    refreshToken: String
  }

# The user receives tokens upon a successful login
  type LoginResponse {
    ok: Boolean!
    token: String
    refreshToken: String
    user: User
    error: String
  }

# The user gets the email where the new auth is send back
 type ForgotPwResponse {
   ok: Boolean!
   error: String
   email: String
 }

# This three sexes are possible
  enum SEX {
    m,
    w,
    t
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

`;
