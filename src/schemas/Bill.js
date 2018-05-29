export const types = `
  type Bill {
    id: Int!
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

  input BillInput {
    positiontext: String
    amount: Float
    currency: String
    billid: Int
    planid: Int
    vendor: Int
    paytime: String
    stornotime: String
  }

# Payment plans for the Apps
  type Plan {
    id: Int!
    name: String!
    teaserdescription: String
    features: JSON
    startdate: String
    enddate: String
    numlicences: Int
    price: Float
    currency: String
    options: JSON
    payperiod: JSON
    cancelperiod: JSON
    optional: Boolean!
    gototime: String
    appid: App!
    gotoplan: Plan
    mainplan: Plan
    subplans: [Plan]
  }

  input PlanInput {
    name: String
    teaserdescription: String
    features: JSON
    startdate: String
    enddate: String
    numlicences: Int
    price: Float
    currency: String
    options: JSON
    payperiod: Interval
    cancelperiod: Interval
    optional: Boolean
    gototime: String
    appid: Int
    gotoplan: Int
    mainplan: Int
  }

  # The plans a unit bought
  type BoughtPlan {
    id: Int!
    buytime: String
    endtime: String
    key: JSON
    buyer: Unit!
    payer: Unit!
    planid: Plan!
    predecessor: Plan
    licences: [Licence]
  }

  type BoughtSubplanData {
    boughtplanid: BoughtPlan!
    subplanid: Plan!
  }

  type PlansRunning {
    id: Int!
    name: String
    teaserdescription: String
    features: JSON
    startdate: String
    enddate: String
    numlicences: Int
    price: Float
    currency: String!
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
    options: JSON
    starttime: String
    endtime: String
    agreed: Boolean
    disabled: Boolean
    key: JSON
    boughtplanid: BoughtPlan!
    unitid: Unit!
  }
`;

export const queries = `
  boughtPlans: [BoughtPlan]!
  fetchPlan(planid: Int!): Plan!
  fetchPlans(appid: Int!): [Plan]!

  fetchBills: [Bill]!

  # This mutation checks whether an user has the right to log into an app
  fetchLicences: [Licence]!
  adminFetchLicences(id: Int!): [Licence]!
  # This mutation checks whether an user has the right to log into an app by providing an app id
  fetchLicencesByApp(appid: Int!): [Licence]!
`;

export const mutations = `
  # This creates a product which can be linked to a plan
  createStripePlan(name: String, productid: String, amount: Int!): Response!

  createPlan(plan: PlanInput!): Response!
  updatePlan(id: Int!, plan: PlanInput!): Response!

  # This allows the user to buy a plan
  buyPlan(planid: Int!, amount: Int!): Response!

  endPlan(id: Int!, enddate: String!): Response!

  createBill(monthly: Boolean): Response!
  addBillPos(bill: BillInput!): Response!
`;
