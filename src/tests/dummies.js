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

export const dummyReviewSimple = {
  appid: expect.any(Number)
};

export const dummyReview = {
  stars: expect.any(Number),
  reviewtext: expect.any(String),
  reviewdate: expect.any(String),
  user: {
    firstname: expect.any(String),
    middlename: expect.any(String),
    lastname: expect.any(String)
  }
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

export const dummyMessageResponseSuccess = {
  error: null,
  ok: true,
  message: expect.anything()
};

export const dummyMessageResponseFailure = {
  error: expect.any(String),
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

export const dummySigninResponse = {
  error: null,
  ok: true,
  user: {
    id: expect.any(Number)
  },
  token: expect.any(String),
  refreshToken: expect.any(String)
};
