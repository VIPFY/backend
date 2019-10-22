const planFields = `
  teaserdescription: String
  features: JSON
  startdate: String
  enddate: String
  numlicences: Int
  price: Float
  currency: String
  options: JSON
  gototime: String
`;

const cardFields = `
  id: String!
  brand: String!
  exp_month: Int!
  exp_year: Int!
  last4: String!
  name: String!
  country: String!
  cvc_check: String!
`;

export const types = `
  type Bill {
    id: ID!
    billtime: String!
    billname: String!
    paytime: String
    stornotime: String
    unitid: Unit!
    amount: String!
    currency: String!
    refundedtime: String
  }

  type BillPosition {
    id: ID!
    billid: Bill!
    positiondata: JSON
    price: Float!
    currency: String!
    boughtplanids: [Int]!
  }

  input BillInput {
    positiontext: String
    price: Float
    currency: String
    billid: ID
    billname: String
    planid: ID
    vendor: ID
    paytime: String
    stornotime: String
  }

# Payment plans for the Apps
  type Plan {
    id: ID!
    name: String!
    ${planFields}
    payperiod: JSON
    cancelperiod: JSON
    optional: Boolean!
    appid: App!
    gotoplan: Plan
    hidden: Boolean!
  }

  input PlanInput {
    ${planFields}
    name: String
    payperiod: Interval
    cancelperiod: Interval
    optional: Boolean
    appid: ID
    gotoplan: ID
  }

  # The plans a unit bought
  type BoughtPlan {
    id: ID!
    buytime: String
    alias: String
    endtime: String
    description: String
    key: JSON
    buyer: Unit!
    payer: Unit!
    usedby: Unit!
    planid: Plan!
    licences: [Licence]
    totalprice: Float
  }

  type PlansRunning {
    id: ID!
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
    id: ID!
    name: String
    startdate: String
    enddate: String
    restrictions: JSON
    description: String
    discount: JSON
    planid: Plan!
    sponsor: Unit!
  }

  type Credit {
    id: ID!   
    amount: Int!   
    created: Date!   
    spentfor: JSON   
    currency: String!  
    expires: String
  }

  type Promocode {
    id: ID!
    credits: Float!
    created: Date!
    expires: Date
    currency: String!
    code: String!
    creditsexpire: Date
  }

  type PromosRunning {
    id: ID!
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
    planid: ID!
  }

  type Card {
    ${cardFields}
  }

  input CardInput {
    ${cardFields}
  }
`;

export const queries = `
  boughtPlans: [BoughtPlan]!
  fetchPlans(appid: ID!): [Plan]!
  fetchPlanInputs(planid: ID!): JSON!
  createLoginLink(boughtplanid: ID!): ProductResponse!

  fetchBills: [Bill]!
  fetchPaymentData: [Card]!
  fetchBillingEmails: [Email]!
  fetchCredits: Credit

  fetchAllBoughtPlansFromCompany(appid: ID!, external: Boolean): [BoughtPlan]!
`;

export const mutations = `
  setBoughtPlanAlias(boughtplanid: ID!, alias: String): Response!
  addPaymentData(data: JSON, address: AddressInput, email: String): Response!
  changeDefaultMethod(card: String!): Response!

  # The buying process
  buyPlan(planid: ID!, features: JSON!, price: Float!, planinputs: JSON!): Response!
  updatePlan(planid: ID!, features: JSON!, price: Float!, planinputs: JSON!): Response!
  cancelPlan(planid: ID!): BoughtPlan!
  reactivatePlan(planid: ID!): BoughtPlan!

  buyVipfyPlan(planid: ID!): Response!

  # This function will be used by a cronjob which runs once a month
  createMonthlyInvoices: Boolean!
  createInvoice(unitid: ID!): Boolean!
  downloadBill(billid: ID!): String!
  
  removeBillingEmail(email: String!): Response!
  addBillingEmail(email: String!): Email!
`;
