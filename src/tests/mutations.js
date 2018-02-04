export const sendMessage = `
  mutation SendMessage($touser: Int!, $message: String!) {
    sendMessage(touser: $touser, message: $message) {
      ok
      id
      message
    }
  }
`;

export const setDeleteStatus = `
  mutation SetDeleteStatus($id: Int!, $model: MESSAGE_MODEL!, $type: MESSAGE_COLUMN!) {
    setDeleteStatus(id: $id, model: $model, type: $type) {
      ok
    }
  }
`;

export const setReadtime = `
  mutation SetReadtime($id: Int!, $model: MESSAGE_MODEL!) {
    setReadtime(id: $id, model: $model) {
      ok
      id
      message
    }
  }
`;

export const signUp = `
  mutation SignUp($email: String!, $newsletter: Boolean) {
    signUp(email: $email, newsletter: $newsletter) {
      ok
      token
      refreshToken
    }
  }
`;

export const signUpConfirm = `
  mutation SignUpConfirm($email: String!, $password: String!) {
    signUpConfirm(email: $email, password: $password) {
      ok
      token
      refreshToken
    }
  }
`;

export const signIn = `
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      ok
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
      email
    }
  }
`;

export const writeReview = `
  mutation WriteReview($appid: Int!, $stars: Int!, $text: String) {
    writeReview(appid: $appid, stars: $stars, text: $text) {
      ok
      id
    }
  }
`;

export const rateReview = `
  mutation RateReview($reviewid: Int!, $balance: Int!) {
    rateReview(reviewid: $reviewid, balance: $balance) {
      ok
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
    }
  }
`;
