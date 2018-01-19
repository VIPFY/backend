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
  sendtime: expect.any(Number),
  message: expect.any(String)
};
