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
    hidden: Boolean!
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
  }

  # The plans a unit bought
  type BoughtPlan {
    id: Int!
    buytime: String
    alias: String
    endtime: String
    description: String
    key: JSON
    buyer: Unit!
    payer: Unit!
    usedby: Unit!
    planid: Plan!
    predecessor: Plan
    licences: [Licence]
    totalprice: Float
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

  type Card {
    id: String!
    brand: String!
    exp_month: Int!
    exp_year: Int!
    last4: String!
    name: String!
    country: String!
    cvc_check: String!
  }

  input CardInput {
    id: String!
    brand: String!
    exp_month: Int!
    exp_year: Int!
    last4: String!
    name: String!
    country: String!
    cvc_check: String!
  }
`;

export const queries = `
  boughtPlans: [BoughtPlan]!
  fetchPlans(appid: Int!): [Plan]!
  fetchPlanInputs(planid: ID!): JSON!
  createLoginLink(boughtplanid: Int!): ProductResponse!

  fetchBills: [Bill]!
  fetchPaymentData: [Card]!
  fetchBillingEmails: [Email]!
`;

export const mutations = `
  setBoughtPlanAlias(boughtplanid: ID!, alias: String): Response!
  addPaymentData(data: JSON, address: AddressInput, email: String): Response!
  # The buying process
  buyPlan(planid: ID!, features: JSON!, price: Float!, planinputs: JSON!): Response!

  # This function will be used by a cronjob which runs once a month
  createMonthlyBill: Response!
  addBillPos(bill: BillInput!, billid: Int): Response!
  downloadBill(billid: Int!): String!
  changeDefaultMethod(card: String!): Response!
`;
