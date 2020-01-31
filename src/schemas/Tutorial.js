export const types = `
  type Tutorial {
    id: ID!
    sectionid: ID!
    nextstep: ID
    page: String
    steptext: String
    updatedate: String
    renderoptions: JSON
  }
`;

export const queries = `
`;

export const mutations = `
updateTutorialProgress(tutorialprogress: JSON!): Response!
closeTutorial(tutorial: String!): Boolean!
`;
