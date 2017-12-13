export const types = `
# The Api-Resonse from DD24
type dd24Response {
  code: Int!
  description: String!
  availability: Int
}

# The props which can be send to the DD24 Api
input dd24 {
  domain: String
  alternative: Int
  cid: String
  period: Int
  extension: [String]
  rr: [String]
  nameserver: [String]
  ttl: Int
  renewalmode: String
  transferlock: Boolean
  whoisprivacy: Boolean
  title: String
  firstname: String
  lastname: String
  organization: String
  street: String
  zip: String
  city: String
  state: String
  country: String
  email: String
  phone: String
  fax: String
  language: String
  vatid: String
}
`;
export const queries = `

`;

export const mutations = `
# Command has to be written like this: CheckDomain, params should be an Object
domainStuff(command: String!, params: dd24): dd24Response!
`;
