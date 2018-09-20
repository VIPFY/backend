export const types = `
  type Website {
    website: String!
    tags: [String]
    verified: Boolean!
    autogenerated: Boolean!
    description: String
    priority: Int
   }

   type Email {
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
    id: Int!
    number: String!
    verified: Boolean!
    autogenerated: Boolean!
    description: String
    priority: Int
    tags: [String]
  }

  type Address {
    id: Int!
    country: String!
    address: JSON
    description: String
    priority: Int
    tags: [String]
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

  input PhoneInput {
    department: Boolean
    number: String
    description: String
    priority: Int
    tags: [String]
  }
`;

export const queries = `
  fetchAddresses(forCompany: Boolean): [Address]!
  fetchPhones(forCompany: Boolean): [Phone]!
`;

export const mutations = `
  createAddress(addressData: AddressInput!, department: Boolean): Address!
  # Without the id parameter, a new address will be generated. Otherwise it will be updated.
  updateAddress(id: Int, address: AddressInput): Address!
  deleteAddress(id: Int!, department: Boolean): Response!

  createPhone(phoneData: PhoneInput!, department: Boolean): Phone!
  updatePhone(id: Int, phone: PhoneInput): Phone!
  deletePhone(id: Int!, department: Boolean): Response!

  newsletterSignup(email: Text!, name: Text): Response!
`;
