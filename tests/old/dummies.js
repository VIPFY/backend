/* eslint-disable import/no-extraneous-dependencies */
import { random } from "lodash";
import { lorem } from "faker";

export const dummyEmail = "pc@vipfy.com";

export const dummyReview = {
  stars: random(1, 5),
  appid: 2,
  text: lorem.sentence()
};

export const dummyReviewFail = {
  stars: 6,
  appid: 2,
  text: lorem.sentence()
};

export const dummyReviewFail2 = {
  stars: random(1, 5),
  appid: 6626654,
  text: lorem.sentence()
};

export const dummyRateReview = {
  reviewid: 1,
  balance: random(0, 2)
};

export const dummyUser = {
  id: expect.any(Number),
  firstname: expect.any(String),
  lastname: expect.any(String)
};

export const dummyApp = {
  id: 2,
  name: "Weebly",
  commission: null,
  disabled: true,
  description:
    "Web-hosting service featuring a drag-and-drop website builder. Include a Shop- and Newsletter-Plugin",
  teaserdescription:
    "Web-hosting service featuring a drag-and-drop website builder. Include a Shop- and Newsletter-Plugin",
  website: "https://weebly.com",
  features: null,
  options: null,
  developer: {
    id: 12
  },
  supportunit: {
    id: 22
  },
  images: ["Weebly.jpeg", "Weebly2.png", "Weebly3.jpg", "Weebly4.png"]
};

export const dummyNewApp = {
  name: "Vipfy Test App",
  commission: {
    text: "We get thousand dollars"
  },
  teaserdescription: "This is a test description",
  description: "This is a test.",
  developer: "21",
  supportunit: "15",
  website: "www.letsgo.de"
};

export const dummyAppImage = {
  id: expect.any(Number),
  link: expect.any(String)
};

export const dummyDeveloper = {
  name: expect.any(String),
  website: expect.any(String)
};

export const dummyCompany = {
  id: expect.any(Number),
  name: expect.any(String)
};

export const dummyUnreadMessage = {
  id: expect.any(Number),
  sendtime: expect.any(Number),
  archivetimesender: null,
  messagetext: expect.any(String),
  readtime: null,
  archivetimereceiver: null,
  sendername: expect.any(String),
  receiver: {
    id: expect.any(Number)
  },
  senderpicture: null
};

export const dummyReadMessage = {
  id: expect.any(Number),
  sendtime: expect.any(Number),
  archivetimesender: null,
  messagetext: expect.any(String),
  readtime: expect.any(Number),
  archivetimereceiver: null,
  sendername: expect.any(String),
  receiver: {
    id: expect.any(Number)
  },
  senderpicture: null
};

export const dummyResponse = { ok: true };

export const dummyReviewResponse = {
  id: expect.any(Number),
  appid: { id: expect.any(Number) },
  stars: expect.any(Number),
  reviewtext: expect.any(String),
  reviewdate: expect.any(String),
  counthelpful: expect.any(Number),
  countunhelpful: expect.any(Number),
  countcomment: expect.any(Number)
};

export const dummyRateReviewResponse = {
  ok: true,
  balance: expect.any(Number)
};

export const dummyMessageResponseSuccess = {
  id: expect.any(Number),
  ok: true,
  message: expect.anything()
};

export const dummyRegisterResponse = {
  ok: true,
  token: expect.any(String)
};

export const dummySignInResponse = {
  ok: true,
  user: {
    id: expect.any(Number)
  },
  token: expect.any(String)
};

export const dummyForgotPwResponse = {
  ok: true,
  email: dummyEmail
};
