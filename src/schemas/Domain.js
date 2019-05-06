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
    status: DOMAINSTATUS
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
    price: String
    currency: String
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

  enum DOMAINSTATUS {
    ACTIVE,
    PENDING,
    EXPIRED
  }

  enum DOMAINACTION {
    ADD
    UPDATE
    DELETE
  }

  enum WEBFORWARDING {
    rd
    mrd
    self
  }
`;

export const queries = `
  fetchDomain(id: ID!): Domain!
  fetchDomains: [Domain]!
  fetchDomainSuggestions(name: String!): [DomainResponse]!
`;

export const mutations = `
  checkDomain(domain: String!): CheckDomainResponse!
  checkTransferReq(domain: String!): JSON!
  requestAuthCode(id: ID!): String!
  registerDomains(domainData: [DomainInput!]!, totalPrice: Float!, agb: Boolean!): [Domain!]!
  transferInDomain(domain: String!, auth: String!): Boolean!
  setWhoisPrivacy(id: ID!, status: Int!): Domain!
  setRenewalMode(id: ID!, renewalmode: RENEWALMODE!): Domain!
  updateNs(id: ID!, ns: String!, action: String!): Domain!
  updateZone(id: ID!, zoneRecord: String, action: DOMAINACTION!): Domain!
  registerExternalDomain(domainData: DomainInput!): Domain!
  deleteExternalDomain(id: ID!): Response!
  checkZone(domain: String!): JSON!
  addWebforwarding(id: ID!, source: String!, target: String!, type: WEBFORWARDING!): Domain
  deleteWebforwarding(id: ID!, source: String!, target: String!, type: WEBFORWARDING!): Domain
`;
