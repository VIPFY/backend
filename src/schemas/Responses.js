// eslint-disable-next-line
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

  # Contains the amount of the respective Unit
    type ListCountResponse {
      users: Int!
      apps: Int!
      companies: Int!
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
      user: User!
    }

  # The user gets the email where the new auth is send back
   type ForgotPwResponse {
     ok: Boolean!
     email: String
   }

  # Response from with a link to login to an app
  type ProductResponse {
    ok: Boolean!
    loginLink: String
  }

  type DepartmentDataResponse {
    id: Int
    children: [Int]
    children_data: JSON
    department: Department
    employees: [User]
    level: Int
    parent: Int
  }

  type DepartmentResponse {
    id: Int
    childids: [Int]
    department: Department
    employees: [emp]
    level: Int
  }

  type emp {
    employeeid: Int
    firstname: String
    lastname: String
    profilepicture: String
  }
`;
