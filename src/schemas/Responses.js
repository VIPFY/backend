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
      allUsers: Int!
      allApps: Int!
      allCompanies: Int!
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

  type DistributeResponse {
    ok: Boolean
    error: Error
  }

  type Error {
    code: Int!
    message: String!
  }

  type AppBoughtPlanResponse {
    usedby: Unit
    boughtplan: BoughtPlan!
    description: String
    appname: String!
    appicon: String
    applogo: String
    appid: Int!
  }

  # The Api-Resonse from DD24
  type DD24Response {
    code: Int!
    description: String!
    availability: Int
    alternative: [String]
    extension: String
    realtime: Int
    cid: String
    status: String
    renewalmode: String
    transferlock: Int
    whoisprivacy: Int
    trustee: Int
    reserveduntil: String
    nameserver: [String]
    ttl: Int
    rr: [rr]
    vatvalid: Int
    event: [Int]
    parameter: eventResponse
    class: String
    subclass: String
    object: String
    objecttype: String
    onetimepassword: String
    loginuri: String
    error: String
  }
`;
