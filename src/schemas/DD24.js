/* eslint-disable-next-line */
export const types = `
# Data of a specific event
  type eventResponse {
    reserveduntil: String
    period: Int
  }

# The props which can be send to the DD24 Api
  input dd24 {
    domain: String
    rr: [rrInput]
    alternative: String
    cid: String
    period: Int
    extensions: extensionInput
    nameserver: [String!]
    ttl: Int
    renewalmode: String
    transferlock: Int
    whoisprivacy: Int
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
    event: Int
    class: String
    subclass: String
    objecttype: String
    object: String
  }

# A nested Object for the nameserver configuration
  type rr {
    zone: [String]
    a: [String]
    mx_host: [String]
    mx_prio: [String]
    cname: [String]
    txt: [String]
    ns: [String]
  }

# A nested Object for the nameserver configuration
  input rrInput {
    zone: String
    a: String
    mx_host: String
    mx_prio: String
    cname: String
    txt: String
    ns: String
  }

# Extensions to be send to the API
  input extensionInput {
    x_de_accept_trustee_tac: Int
  }
`;
