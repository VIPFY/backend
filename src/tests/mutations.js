export const sendMessage = `
  mutation SendMessage($fromuser: Int!, $touser: Int!, $message: String!) {
    sendMessage(fromuser: $fromuser, touser: $touser, message: $message) {
      ok
      error
      id
      message
    }
  }
`;

export const setDeleteStatus = `
  mutation SetDeleteStatus($id: Int!, $model: MESSAGE_MODEL!, $type: MESSAGE_COLUMN!) {
    setDeleteStatus(id: $id, model: $model, type: $type) {
      ok
      error
    }
  }
`;

export const setReadtime = `
  mutation SetReadtime($id: Int!, $model: MESSAGE_MODEL!) {
    setReadtime(id: $id, model: $model) {
      ok
      id
      message
      error
    }
  }
`;

export const signUp = `
  mutation SignUp($email: String!, $newsletter: Boolean) {
    signUp(email: $email, newsletter: $newsletter) {
      ok
      token
      refreshToken
      error
    }
  }
`;

export const signUpConfirm = `
  mutation SignUpConfirm($email: String!, $password: String!) {
    signUpConfirm(email: $email, password: $password) {
      ok
      error
      token
      refreshToken
    }
  }
`;

export const signIn = `
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      ok
      error
      user {
        id
      }
      token
      refreshToken
    }
  }
`;

export const forgotPassword = `
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email) {
      ok
      error
      email
    }
  }
`;

export const writeReview = `
  mutation WriteReview($userid: Int!, $appid: Int!, $stars: Int!, $text: String) {
    writeReview(userid: $userid, appid: $appid, stars: $stars, text: $text) {
      error
      ok
      id
    }
  }
`;

export const rateReview = `
  mutation RateReview($reviewid: Int!, $userid: Int!, $balance: Int!) {
    rateReview(reviewid: $reviewid, userid: $userid, balance: $balance) {
      ok
      error
      balance
      id
    }
  }
`;

export const weeblyCreateLoginLink = `
  mutation WeeblyCommands($email: String!, $agb: Boolean!, $plan: Int!, $domain: String!) {
    weeblyCreateLoginLink(email: $email, agb: $agb, plan: $plan, domain: $domain) {
      loginLink
      ok
      error
    }
  }
`;
