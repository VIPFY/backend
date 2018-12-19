export const types = `
  type Tutorial {
    id: ID!
    sectionid: ID!
    nextstep: ID
    page: String
    steptext: String
    starttext: String
    updatedate: String
    highlightelement: String
  }

  type TutorialUsage {
    id: ID!
    userid: User!
    sectionid: ID!
    laststep: ID
    donedate: String
  }
`;
export const queries = `
  tutorialSteps: [Tutorial]!
`;

/*export const mutations = `
  setTutorialStep(step: ID!): Response!
`;*/
