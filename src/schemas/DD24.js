export const types = `
  type Domain {
    id: ID!
    domainname: String!
    accountid: String!
    createdate: String!
    renewaldate: String
    renewalmode: String!
    whoisprivacy: Boolean!
    statisticdata: JSON
    unitid: User!
  }

# Data of a specific event
  type eventResponse {
    reserveduntil: String
    period: Int
  }

# The props which can be send to the DD24 Api
  input DD24 {
    domain: String!
    renewalmode: RENEWALMODE
    whoisprivacy: Int
    dns: [DNSRecord]
  }

# A nested Object for the nameserver configuration
  input DNSRecord {
    type: DNSType!
    host: String!
    data: String!
  }

  enum DNSType {
    CNAME,
    A,
    AAAA,
    MX_HOST,
    MX_PRIO,
    TXT,
    NS,
  }

# ONCE directly renewals the domain and sets it to AUTODELETE, AUTODELETE deletes
# the domain at the end of the runtime
  enum RENEWALMODE {
    AUTORENEW,
    ONCE,
    AUTODELETE
  }
`;

export const queries = `
  fetchDomains: [Domain]!
`;

export const mutations = `
  registerDomain(domainData: DD24!): Response!
  updateDomain(domainData: DD24!, licenceid: Int!): Response!
`;
