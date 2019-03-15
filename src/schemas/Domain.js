export const types = `
  type Domain {
    id: ID!
    domainname: String!
    createdate: Date!
    renewaldate: Date
    renewalmode: String!
    whoisprivacy: Boolean!
    statisticdata: JSON
    dns: JSON,
    boughtplanid: BoughtPlan!
    external: Boolean!
  }

# Data of a specific event
  type eventResponse {
    reserveduntil: String
    period: Int
  }

# The props which can be send to the DD24 Api
  input DomainInput {
    domain: String
    tld: TLD
    renewalmode: RENEWALMODE
    whoisprivacy: Boolean
    renewaldate: Date
    createdate: Date
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

  enum TLD {
    org,
    com,
    net
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
  checkDomain(domain: String!): CheckDomainResponse!
  registerDomain(domainData: DomainInput!): Domain!
  updateDomain(domainData: DomainInput!, id: ID!): Response!
  registerExternalDomain(domainData: DomainInput!): Domain!
  deleteExternalDomain(id: ID!): Response!
`;
