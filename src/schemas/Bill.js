export const types = `
  type Bill {
    id: Int!
    type: Boolean
    billtime: String
    paytime: String
    stornotime: String
    unitid: Unit!
  }

  type BillPosition {
    id: Int!
    positiontext: String
    amount: Float
    currency: String!
    billid: Bill!
    planid: Plan!
    vendor: Unit!
  }

# Payment plans for the Apps
  type Plan {
    id: Int!
    name: String
    teaserdescription: String
    features: JSON
    startdate: String
    enddate: String
    numlicences: Int
    amount: Float
    currency: String
    options: JSON
    appid: App!
  }

  # The plans a unit bought
  type BoughtPlan {
    id: Int!
    buytime: String
    endtime: String
    key: JSON
    buyer: Unit!
    buyfor: Unit
    planid: Plan!
  }

  type PlansRunning {
    id: Int!
    name: String
    teaserdescription: String
    features: JSON
    startdate: String
    enddate: String
    numlicences: Int
    amount: Float
    currency: String
    options: JSON
    appid: App!
  }

  type Promo {
    id: Int!
    name: String
    startdate: String
    enddate: String
    restrictions: JSON
    description: String
    discount: JSON
    planid: Plan!
    sponsor: Unit!
  }

  type PromosRunning {
    id: Int!
    name: String
    startdate: String
    enddate: String
    restrictions: JSON
    description: String
    discount: JSON
    planid: Plan!
    sponsor: Unit!
  }

  type Licence {
    id: Int!
    options: JSON
    starttime: String
    endtime: String
    boughtplanid: BoughtPlan!
    unitid: Unit!
  }
`;

export const queries = `
  boughtPlans(unitid: Int!): [BoughtPlan]!
`;

export const mutations = `
  # This creates a product which can be linked to a plan
  createStripePlan(name: String, productid: String, amount: Int!): Response!

  # This allows the user to buy a plan
  buyPlan(planid: Int!, buyFor: Int): Response!
`;
