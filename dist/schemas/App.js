"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var types = exports.types = "\n  type App {\n    id: Int!\n    name: String!\n    applogo: String\n    description: String\n    developerid: Int!\n    modaltype: Int\n    versionnumber: String\n    updatedate: Date\n    teaserdescription: String\n    ownpage: String\n    supportphone: String\n    supportwebsite: String\n  }\n\n  type AppImage {\n    id: Int!\n    appid: Int!\n    link: String\n    sequence: Int\n  }\n\n# A Developer is the creator of an App\n  type Developer {\n    id: Int!\n    name: String!\n    website: String\n    legalwebsite: String\n    bankaccount: String\n  }\n\n# Payment plans from the Apps\n  type Plan {\n    id: Int!\n    appid: Int!\n    app: App!\n    description: String\n    renewalplan: Int\n    period: Int\n    numlicences: Int\n    price: Float\n    currency: String\n    name: String\n    activefrom: String\n    activeuntil: String\n    promo: Int\n    promovipfy: Float\n    promodeveloper: Float\n    promoname: String\n    changeafter: Int\n    changeplan: Int\n  }\n";

var queries = exports.queries = "\n  allApps(first: Int): [App]!\n  fetchApp(name: String!): App\n\n  allAppImages: [AppImage]!\n  fetchAppImages(appid: Int!): [AppImage!]\n\n  allDevelopers: [Developer]!\n  fetchDeveloper(id: Int!): Developer\n\n  fetchPlans(appid: Int!): [Plan]!\n  fetchPrice(appid: Int!): Plan!\n";

var mutations = exports.mutations = "\n\n";