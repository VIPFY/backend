export const types = `
type AppImage {
  id: Int!
  appid: Int!
  link: String
  sequence: Int
}
`;

export const queries = `
allAppImages: [AppImage]!
fetchAppImages(appid: Int!): [AppImage!]
`;

export const mutations = `

`;
