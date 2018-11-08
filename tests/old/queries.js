export const fetchMessages = `
  query FetchMessages($read: Boolean) {
    fetchMessages(read: $read) {
      id
      sendtime
      archivetimesender
      messagetext
      readtime
      archivetimereceiver
      sendername
      receiver {
        id
      }
      senderpicture
    }
  }
`;

export const allUsers = `
  query {
    allUsers {
      id
      firstname
      lastname
    }
  }
`;

export const me = `
  query {
    me {
      id
      admin
    }
  }
`;

export const admin = `
  query {
    admin {
      id
      admin
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
{
  allReviews {
    id
    appid {
      id
    }
    reviewdate
    stars
    reviewtext
    counthelpful
    countunhelpful
    countcomment
  }
}
`;

export const fetchReviews = `
  query FetchReviews($appid: Int!) {
    fetchReviews(appid: $appid) {
      id
      appid {
        id
      }
      stars
      reviewdate
      reviewtext
      counthelpful
      countunhelpful
      countcomment
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

export const fetchAppById = `
  query FetchAppById($id: ID!){
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
