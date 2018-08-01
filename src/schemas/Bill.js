export const types = `
  type Bill {
    id: Int!
    billtime: String!
    billname: String!
    paytime: String
    stornotime: String
    unitid: Unit!
  }

  type BillPosition {
    id: Int!
    positiontext: String
    price: Float
    currency: String!
    billid: Bill!
    planid: Plan!
    vendor: Unit!
  }

  input BillInput {
    positiontext: String
    price: Float
    currency: String
    billid: Int
    billname: String
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
    description: String
    key: JSON
    buyer: Unit!
    payer: Unit!
    usedby: Unit!
    planid: Plan!
    predecessor: Plan
    licences: [Licence]
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

  input OptionalPlanData {
    amount: Int!
    planid: Int!
  }
`;

export const queries = `
  boughtPlans: [BoughtPlan]!
  fetchPlan(planid: Int!): Plan!
  fetchPlans(appid: Int!): [Plan]!
  createLoginLink(boughtplanid: Int!): ProductResponse!

  fetchBills: [Bill]!
  fetchBillingAddresses: [Address]!
`;

export const mutations = `
  # This creates a product which can be linked to a plan
  createStripePlan(name: String, productid: String, amount: Int!): Response!

  # This allows the user to buy a plan
  buyPlan(planIds: [Int]!, options: Options): Response!

  endPlan(id: Int!, enddate: String!): Response!

  # This function will be used by a cronjob which runs once a month
  createMonthlyBill: Response!
  addBillPos(bill: BillInput!, billid: Int): Response!
  downloadBill(billid: Int!): String!
`;
