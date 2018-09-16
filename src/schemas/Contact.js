export const types = `
  type Website {
    website: String!
    tags: [String]
    verified: Boolean!
    autogenerated: Boolean!
    description: String
    priority: Int
    unitid: Unit
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
    number: String!
    verified: Boolean!
    autogenerated: Boolean!
    description: String
    priority: Int
    tags: [String]
    unitid: Unit!
  }

  type Address {
    id: Int!
    country: String!
    address: JSON
    description: String
    priority: Int
    tags: [String]
    unitid: Unit!
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
`;

export const queries = `
  fetchAddresses(forCompany: Int): [Address]!
`;

export const mutations = `
  createAddress(addressData: AddressInput!, department: Boolean): Address!
  # Without the id parameter, a new address will be generated. Otherwise it will be updated.
  updateAddress(id: Int, country: String, address: AddressInput, description: String, priority: Int, department: Boolean): Address!
  deleteAddress(id: Int!, department: Boolean): Response!
`;
