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
fetchAppImage(appid: Int!): AppImage
`;

export const mutations = `

`;
