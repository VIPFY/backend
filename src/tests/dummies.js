/* eslint-disable import/no-extraneous-dependencies */
import { random } from "lodash";
import { lorem } from "faker";

export const dummyEmail = "Lauryn_Reilly@gmail.com";

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
  appid: 662,
  text: lorem.sentence()
};

export const dummyRateReview = {
  reviewid: 1,
  balance: random(0, 2)
};

export const dummyUser = {
  email: expect.any(String),
  id: expect.any(Number)
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
  commission: "22",
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

export const dummyMessage = {
  id: expect.any(Number),
  type: expect.any(Number),
  message: expect.any(String)
};

export const dummyResponse = {
  ok: true
};

export const dummyReviewSimpleResponse = {
  appid: expect.any(Number)
};

export const dummyWriteReviewResponse = {
  ok: true,
  id: expect.any(Number)
};

export const dummyReviewResponse = {
  stars: expect.any(Number),
  reviewtext: expect.any(String),
  reviewdate: expect.any(String),
  user: {
    firstname: expect.any(String),
    middlename: expect.any(String),
    lastname: expect.any(String)
  }
};

export const dummyRateReviewResponse = {
  ok: true,
  balance: expect.any(Number),
  id: null
};

export const dummyMessageResponseSuccess = {
  id: expect.any(Number),
  ok: true,
  message: expect.anything()
};

export const dummyRegisterResponse = {
  ok: true,
  token: expect.any(String),
  refreshToken: expect.any(String)
};

export const dummySignInResponse = {
  ok: true,
  user: {
    id: expect.any(Number)
  },
  token: expect.any(String),
  refreshToken: expect.any(String)
};

export const dummyForgotPwResponse = {
  ok: true,
  email: dummyEmail
};

export const dummyWeeblyResponse = {
  ok: true,
  loginLink: expect.any(String)
};
