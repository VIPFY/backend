export const fetchMessages = `
  query FetchMessages{
    fetchMessages {
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
      commission
      disabled
      description
      teaserdescription
      website
      features
      options
      developer {
        id
      }
      supportunit {
        id
      }
      images
    }
  }
`;

export const fetchApp = `
  query FetchApp($name: String!){
    fetchApp(name: $name) {
      id
      name
      commission
      disabled
      description
      teaserdescription
      website
      features
      options
      developer {
        id
      }
      supportunit {
        id
      }
      images
    }
  }
`;

export const fetchAppById = `
  query FetchAppById($id: Int!){
    fetchAppById(id: $id) {
      id
      name
      commission
      disabled
      description
      teaserdescription
      website
      features
      options
      developer {
        id
      }
      supportunit {
        id
      }
      images
    }
  }
`;
