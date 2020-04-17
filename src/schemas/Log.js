export const types = `
type Log {
  id: ID!
  time: Date,
  eventtype: String!,
  eventdata: JSON,
  ip: String!,
  deviceid: ID!,
  hostname: String!,
  user: ID! ,
  sudoer: ID!
}`;

export const queries = `
  # Returns all logs.
  fetchAllLogs(limit: Int, offset: Int): [Log]
`;
