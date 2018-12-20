export const types = `
  type Website {
    id: ID!
    website: String!
    tags: [String]
    verified: Boolean!
    autogenerated: Boolean!
    description: String
    priority: Int
   }

   type Email {
     unitid: Unit!
     email: String!
     verified: Boolean!
     autogenerated: Boolean!
     description: String
     priority: Int!
     tags: [String]
     createdat: Date!
     verifyuntil: Date
   }

  type Phone {
    id: ID!
    number: String!
    verified: Boolean!
    autogenerated: Boolean!
    description: String
    priority: Int
    tags: [String]
  }

  type Address {
    id: ID!
    country: String!
    address: JSON
    description: String
    priority: Int
    tags: [String]
    verified: Boolean
  }

  input AddressInput {
    department: Boolean
    description: String
    country: String
    street: String
    city: String
    state: String
    zip: String
    priority: Int
    tags: [String]
  }

  input EmailInput {
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
  }

  input PhoneInput {
    department: Boolean
    number: String
    description: String
    priority: Int
    tags: [String]
  }
`;

export const queries = `
  fetchAddresses(forCompany: Boolean, tag: String): [Address]!
  fetchPhones(forCompany: Boolean): [Phone]!
  fetchEmails(forCompany: Boolean, tag: String): [Email]!
  searchAddressByCompanyName: JSON!
`;

export const mutations = `
  createAddress(addressData: AddressInput!, department: Boolean): Address!
  # Without the id parameter, a new address will be generated. Otherwise it will be updated.
  updateAddress(id: ID, address: AddressInput): Address!
  deleteAddress(id: ID!, department: Boolean): Response!
  contact(email: String!, company: String!, message: String!, type: String!, name: String!): Boolean!

  createPhone(phoneData: PhoneInput!, department: Boolean): Phone!
  updatePhone(id: ID, phone: PhoneInput): Phone!
  deletePhone(id: ID!, department: Boolean): Response!

  newsletterSignup(email: String!, firstname: String, lastname: String): Response!
  newsletterSignupConfirm(email: String!, token: String!): Response!

  searchAddress(input: String!, region: String!): JSON!

  createEmail(emailData: EmailInput! forCompany: Boolean): Email!
  updateEmail(email: String!, emailData: EmailUpdateInput!): Response!
  deleteEmail(email: String!, forCompany: Boolean): Response!

  updateTags(model: String!, tags: [String]!): Response!
`;
