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
    features: Features
    startdate: String
    enddate: String
    numlicences: Int
    amount: Float
    currency: String
    options: Options
    appid: App!
  }

  # The plans a unit bought
  type BoughtPlan {
    id: Int!
    buytime: String
    endtime: String
    key: Key
    buyer: Unit!
    buyfor: Unit
    planid: Plan!
  }

  type PlansRunning {
    id: Int!
    name: String
    teaserdescription: String
    features: Features
    startdate: String
    enddate: String
    numlicences: Int
    amount: Float
    currency: String
    options: Options
    appid: App!
  }

  type Key {
    a: String
  }

  type Promo {
    id: Int!
    name: String
    startdate: String
    enddate: String
    restrictions: Restrictions
    description: String
    discount: Discount
    planid: Plan!
    sponsor: Unit!
  }

  type Discount {
    a: String
  }

  type PromosRunning {
    id: Int!
    name: String
    startdate: String
    enddate: String
    restrictions: Restrictions
    description: String
    discount: Discount
    planid: Plan!
    sponsor: Unit!
  }

  type Licence {
    id: Int!
    options: Options
    starttime: String
    endtime: String
    boughtplanid: BoughtPlan!
    unitid: Unit!
  }
`;

export const queries = ``;
