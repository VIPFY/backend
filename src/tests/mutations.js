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
  mutation SetDeleteStatus($id: Int!, $type: MESSAGE_COLUMN!) {
    setDeleteStatus(id: $id, type: $type) {
      ok
    }
  }
`;

export const setReadtime = `
  mutation SetReadtime($id: Int!) {
    setReadtime(id: $id) {
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
    }
  }
`;

export const rateReview = `
  mutation RateReview($reviewid: Int!, $balance: Int!) {
    rateReview(reviewid: $reviewid, balance: $balance) {
      ok
      balance
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

export const createApp = `
  mutation CreateApp($app: AppInput!) {
    createApp(app: $app) {
      ok
    }
  }
`;

export const updateApp = `
  mutation UpdateApp($app: AppInput!, $id: Int!) {
    updateApp(app: $app, id: $id) {
      ok
    }
  }
`;

export const toggleAppStatus = `
  mutation ToggleAppStatus($id: Int!) {
    toggleAppStatus(id: $id) {
      ok
    }
  }
`;

export const deleteApp = `
  mutation DeleteApp($id: Int!) {
    deleteApp(id: $id) {
      ok
    }
  }
`;

export const freezeAccount = `
  mutation FreezeAccount($unitid: Int!) {
    freezeAccount(unitid: $unitid) {
      ok
    }
  }
`;

export const adminUpdateUser = `
  mutation AdminUpdateUser($userData: UserInput!, $unitid: Int!) {
    adminUpdateUser(user: $userData, unitid: $unitid) {
      ok
    }
  }
`;

export const deleteUser = `
  mutation DeleteUser($unitid: Int!) {
    deleteUser(unitid: $unitid) {
      ok
    }
  }
`;
