export const types = `
# The basic Response
  type Response {
    ok: Boolean!
    message: String
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
