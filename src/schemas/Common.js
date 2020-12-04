export const types = `
# This three sexes are possible
enum SEX {
  m,
  f,
  u
}

enum VACATION_STATUS {
  PENDING,
  REJECTED,
  CONFIRMED,
  CANCELLED
}

# An user must have one of these stati
enum USER_STATUS {
  toverify,
  normal,
  banned,
  onlynews
}

# Directions for sorting
enum ORDER {
  ASC,
  DESC
}

# Custom Scalar Date
  scalar Date

# Custom Scalar JSON
  scalar JSON

type Notification {
  id: ID!
  receiver: PublicUser!
  sendtime: String!
  readtime: String!
  message: String
  icon: String
  link: String
  changed: [String]
  options: JSON
}

type Newsletter {
  email: Email!
  activesince: String!
  activeuntil: String
}

type Token {
  id: ID!
  email: Email!
  token: String!
  createdat: Date!
  usedat: Date
  expiresat: Date
  data: JSON
  type: String!
}

# Necessary to upload pictures
type File {
  filename: String!
  mimetype: String!
  encoding: String!
}

# Interval
input Interval {
  years: String,
  months: String,
  weeks: String,
  days: String
}

input SortOptions {
  name: String!
  order: ORDER!
}

input Options {
  domain: String
  whoisPrivacy: Int
}
`;

export const queries = `
  fetchNotifications: [Notification]!
  checkMailExistance(email: String): Boolean!
  pingServer: Response!
`;

export const mutations = `
  # Checks whether an email already exists in our database
  logSSOError(eventdata: JSON): Boolean!
  readNotification(id: ID!): Boolean!
  readAllNotifications: Boolean!

  sendUsageData(data: Upload!): Boolean!

  checkVat(vat: String!, cc: String!): String!

  # for uptime checks and dummy queries
  ping: Response!
  logEvent(eventtype: String, data: JSON): Boolean
`;

export const subscriptions = `
  newNotification: Notification!
`;
