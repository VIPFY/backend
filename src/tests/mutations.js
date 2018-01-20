export const sendMessage = `
  mutation SendMessage($fromuser: Int!, $touser: Int!, $message: String!) {
    sendMessage(fromuser: $fromuser, touser: $touser, message: $message) {
      ok
      error
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
