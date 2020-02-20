import { tester } from "graphql-tester";
import { request } from "request";

const testing = tester({
  url: "http://backend-dev2.eu-central-1.elasticbeanstalk.com/graphql",
  method: "POST",
  contentType: "application/json"
});

const queryWrapper = function(query) {
  return '{"operationName":null,"variables":{},"query":"' + query + '"}';
};

// Mutations: signUp(tested with already used email), signUpConfirm(later),
// forgotPassword, redeemSetupToken(later), resendToken
// Above tested manually, everything works!

// Done: signIn, agreeTos, changePassword, setupFinished, forcePasswordChange

describe("Testing admin mutations with valid token", () => {
  var token;

  describe("Testing signUp:", () => {
    it("with already used email, expect failure", async () => {
      const query =
        'mutation{signUp(email:\\"testmail147@abv.bg\\", companyname: \\"Test Company Name\\", privacy:true, termsOfService:true){ok}}';
      const response = await testing(queryWrapper(query));

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(false);
      expect(response.errors).toHaveLength(1);
      expect(response.data).toEqual(null);
    });
  });

  describe("Testing signIn:", () => {
    it("with valid data, expect success ", async () => {
      const query =
        'mutation{signIn(email:\\"testmail147@abv.bg\\", password: \\"testPass123\\"){token}}';
      const response = await testing(queryWrapper(query));
      token = response.data.signIn.token;
      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.errors).not.toBeDefined();
      expect(response.data.signIn.token).toBeDefined();
    });

    it("with wrong credentials, expect NormalError", async () => {
      const query =
        'mutation{signIn(email:\\"wrongemail@mail.com\\", password: \\"wrongPassword123\\"){ok}}';
      const response = await testing(queryWrapper(query));

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(false);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("NormalError");
      expect(response.errors[0].message).toEqual(
        "Email or Password incorrect!"
      );
      expect(response.data).toEqual(null);
    });

    it("with wrong password, but correct email", async () => {
      const query =
        'mutation{signIn(email:\\"testmail147@abv.bg\\", password:\\"wrongpass\\"){ok}}';
      const response = await testing(queryWrapper(query));

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(false);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("NormalError");
      expect(response.errors[0].message).toEqual(
        "Email or Password incorrect!"
      );
      expect(response.data).toEqual(null);
    });
  });

  describe("Testing setupFinished:", () => {
    it("without any arguments, expect success", async () => {
      const query = "mutation{setupFinished{ok}}";
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.errors).not.toBeDefined();
      expect(response.data.setupFinished.ok).toEqual(true);
    });

    it("with username arguments, expect success and check if firstname and lastname are set properly", async () => {
      var query = 'mutation{setupFinished(username:\\"Test User\\"){ok}}';
      var response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });
      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.errors).not.toBeDefined();
      expect(response.data.setupFinished.ok).toEqual(true);

      // Checks whether setupFinished with username arguments sets the names properly
      query = "{me{firstname lastname}}";
      response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });
      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.errors).not.toBeDefined();
      expect(response.data.me.firstname).toEqual("Test");
      expect(response.data.me.lastname).toEqual("User");
    });
  });

  describe("Testing agreeTos:", () => {
    it("with valid token, expect success", async () => {
      const query = "mutation{agreeTos{ok}}";
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.errors).not.toBeDefined();
      expect(response.data.agreeTos.ok).toEqual(true);
    });
  });

  describe("Testing forcePasswordChange:", () => {
    it("with random user id as admin user, expect success", async () => {
      const query = "mutation{forcePasswordChange(userids:[999]){ok}}";
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.data.forcePasswordChange.ok).toEqual(true);
    });
    /* TODO: check as normal user
    it("with random user id as normal user, expect RightsError", async () => {
      const query = "mutation{forcePasswordChange(userids:[999]){ok}}";
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });*/
  });

  describe("Testing changePassword:", () => {
    it("with same old and new password, expect NormalError: Same passwords!", async () => {
      const query =
        'mutation{changePassword(pw:\\"testPass123\\", newPw:\\"testPass123\\", confirmPw:\\"testPass123\\"){ok}}';
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(false);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("NormalError");
      expect(response.errors[0].message).toEqual(
        "Current and new password can't be the same one!"
      );
    });

    it("with wrong old password, expect NormalError : Incorrect old password!", async () => {
      const query =
        'mutation{changePassword(pw:\\"wrongPass123\\", newPw:\\"testPass123\\", confirmPw:\\"testPass123\\"){ok}}';
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });

      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(false);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].name).toEqual("NormalError");
      expect(response.errors[0].message).toEqual("Incorrect old password!");
    });

    it("with different old and new passwords, expect successful change", async () => {
      const query =
        'mutation{changePassword(pw:\\"testPass123\\", newPw:\\"testPass1234\\", confirmPw:\\"testPass1234\\"){ok}}';
      const response = await testing(queryWrapper(query), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });
      expect(response).toBeDefined();
      expect(response.status).toEqual(200);
      expect(response.success).toEqual(true);
      expect(response.errors).not.toBeDefined();
      expect(response.data.changePassword.ok).toEqual(true);

      const setOldPassword =
        'mutation{changePassword(pw:\\"testPass1234\\", newPw:\\"testPass123\\", confirmPw:\\"testPass123\\"){ok}}';
      const setPassword = await testing(queryWrapper(setOldPassword), {
        headers: {
          "x-token": token,
          "Content-Type": "application/json"
        }
      });
    });
  });

  describe("Testing forgotPassword:", () => {
    //TODO: Finish
  });

  describe("Testing resendToken:", () => {
    //TODO: Finish
  });
});
