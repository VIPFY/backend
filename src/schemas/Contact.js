const common = `
  verified: Boolean!
  autogenerated: Boolean!
  tags: [String]
  description: String
`;

export const types = `
  type Website {
    id: ID!
    ${common}
    website: String!
    priority: Int
   }

   type TradeFair {
     id: ID!
     name: String!
     email: String!
     created: Date!
     trade_fair: String!
     year: Int!
   }

   type Email {
     ${common}
     unitid: Unit!
     email: String!
     priority: Int!
     createdat: Date!
     verifyuntil: Date
   }

  type Phone {
    id: ID!
    number: String!
    ${common}
    priority: Int
  }

  type Address {
    id: ID
    country: String
    address: JSON
    description: String
    priority: Int
    tags: [String]
    verified: Boolean
  }

  input AddressInput {
    id: ID
    department: Boolean
    description: String
    country: String
    street: String
    city: String
    state: String
    postalCode: String
    addition: String
    priority: Int
    tags: [String]
  }

  input EmailInput {
    id: ID
    email: String!
    verified: Boolean
    autogenerated: Boolean
    description: String
    priority: Int
    tags: [String]
  }

  input EmailUpdateInput {
    description: String
    priority: Int
    addTags: [String!]
    removeTags: [String!]
  }

  input PhoneInput {
    department: Boolean
    number: String
    description: String
    priority: Int
    tags: [String]
  }

  input ContactInput {
    email: String!
    company: String!
    message: String!
    type: String!
    name: String!
    website: String
    program: String
  }
`;

export const queries = `
  fetchAddresses(forCompany: Boolean, tag: String): [Address]!
  fetchPhones(forCompany: Boolean): [Phone]!
  fetchEmails(forCompany: Boolean, tag: String): [DepartmentEmail]!
  searchAddressByCompanyName: JSON!
`;

export const mutations = `
  createAddress(addressData: AddressInput!, department: Boolean): Address!
  # Without the id parameter, a new address will be generated. Otherwise it will be updated.
  updateAddress(id: ID, address: AddressInput): Address!
  deleteAddress(id: ID!, department: Boolean): Response!
  contact(contactData: ContactInput!): Boolean!

  createPhone(phoneData: PhoneInput!, department: Boolean, userid: ID): Phone!
  updatePhone(id: ID, phone: PhoneInput, userid: ID): Phone!
  deletePhone(id: ID!, department: Boolean, userid: ID): Response!

  newsletterSignup(email: String!, firstname: String, lastname: String): Response!
  newsletterSignupConfirm(email: String!, token: String!): Response!

  searchAddress(input: String!, region: String!): JSON!

  createEmail(emailData: EmailInput!, forCompany: Boolean, userid: ID): Email!
  updateEmail(email: String!, emailData: EmailUpdateInput!): Boolean!
  deleteEmail(email: String!, forCompany: Boolean, userid: ID): Response!

  updateTags(model: String!, tags: [String]!): Response!
  promoCodeRequest(fair: String!, name: String!, email: String!, newsletter: Boolean!): Boolean!
`;
