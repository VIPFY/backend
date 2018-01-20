// This file contains all the queries which will be tested

export const fetchMessages = `
  query FetchMessages($id: Int!){
    fetchMessages(id: $id) {
      id
      type
      message
    }
  }
`;

export const allUsers = `
  query {
    allUsers {
      id
      email
      userstatus
    }
  }
`;

export const me = `
  query {
    me {
      id
      email
    }
  }
`;

export const fetchUser = `
  query FetchUser($id: Int!){
    fetchUser(id: $id) {
      id
      email
    }
  }
`;

export const allCompanies = `
  query {
    allCompanies {
      name
      id
    }
  }
`;

export const allReviews = `
  query {
    allReviews {
      appid
    }
  }
`;

export const fetchReview = `
  query FetchReview($appid: Int!) {
    fetchReview(appid: $appid) {
      stars
      reviewtext
      reviewdate
      user {
        firstname
        lastname
        middlename
      }
    }
  }
`;

export const allApps = `
  query {
    allApps {
      id
      name
      developerid
      description
      applogo
    }
  }
`;

export const allAppImages = `
  query {
    allAppImages {
      id
      link
    }
  }
`;

export const fetchAppImages = `
  query FetchAppImages($appid: Int!){
    fetchAppImages(appid: $appid) {
      id
      link
    }
  }
`;

export const fetchApp = `
  query FetchApp($name: String!){
    fetchApp(name: $name) {
      id
      name
      developerid
      description
      applogo
    }
  }
`;

export const fetchDeveloper = `
  query FetchDeveloper($developerid: Int!) {
    fetchDeveloper(id: $developerid) {
      name
      website
    }
  }
`;
