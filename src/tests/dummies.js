import { random } from "lodash";
import { lorem } from "faker";
export const dummyEmail = "Lauryn_Reilly@gmail.com";

export const dummyReview = {
  stars: random(1, 5),
  appid: 2,
  text: lorem.sentence(),
  userid: random(1, 77)
};

export const dummyReviewFail = {
  stars: 6,
  appid: 2,
  text: lorem.sentence(),
  userid: random(1, 77)
};

export const dummyReviewFail2 = {
  stars: random(1, 5),
  appid: 662,
  text: lorem.sentence(),
  userid: random(1, 77)
};

export const dummyReviewFail3 = {
  stars: random(1, 5),
  appid: 2,
  text: lorem.sentence(),
  userid: 100000
};

export const dummyRateReview = {
  reviewid: 1,
  userid: random(1, 80),
  balance: random(0, 2)
};

export const dummyUser = {
  email: expect.any(String),
  id: expect.any(Number)
};

export const dummyApp = {
  id: expect.any(Number),
  name: expect.any(String),
  developerid: expect.any(Number),
  description: expect.any(String),
  applogo: expect.stringMatching(/[\w]+\.[a-zA-z]{3,4}/)
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
  error: null,
  ok: true
};

export const dummyResponseFailure = {
  error: expect.any(String),
  ok: false
};

export const dummyReviewSimpleResponse = {
  appid: expect.any(Number)
};

export const dummyWriteReviewResponse = {
  ok: true,
  error: null,
  id: expect.any(Number)
};

export const dummyWriteReviewResponseFailure = {
  ok: false,
  error: expect.any(String),
  id: null
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
  error: null,
  balance: expect.any(Number),
  id: null
};

export const dummyRateReviewResponseFailure = {
  ok: false,
  error: expect.any(String),
  balance: null,
  id: null
};

export const dummyMessageResponseSuccess = {
  error: null,
  id: expect.any(Number),
  ok: true,
  message: expect.anything()
};

export const dummyMessageResponseFailure = {
  error: expect.any(String),
  id: null,
  ok: false,
  message: null
};

export const dummyRegisterResponse = {
  error: null,
  ok: true,
  token: expect.any(String),
  refreshToken: expect.any(String)
};

export const dummyRegisterResponseFailure = {
  error: expect.any(String),
  ok: false,
  token: null,
  refreshToken: null
};

export const dummySignInResponse = {
  error: null,
  ok: true,
  user: {
    id: expect.any(Number)
  },
  token: expect.any(String),
  refreshToken: expect.any(String)
};

export const dummySignInResponseFailure = {
  error: expect.any(String),
  ok: false,
  user: null,
  token: null,
  refreshToken: null
};

export const dummyForgotPwResponse = {
  ok: true,
  error: null,
  email: dummyEmail
};

export const dummyForgotPwResponseFailure = {
  ok: false,
  error: expect.any(String),
  email: null
};

export const dummyWeeblyResponse = {
  ok: true,
  error: null,
  loginLink: expect.any(String)
};

export const dummyWeeblyResponseFailure = {
  ok: false,
  error: expect.any(String),
  loginLink: null
};
