import request from "supertest";
import { BaseUsers, userSchema } from "../../model/user";
import { useModel } from "@apparts/model";

const jestFn = jest.fn;
const mailObj = {
  sendMail: () => {},
} as {
  sendMail: ReturnType<typeof jestFn>;
};
import { addRoutes } from "../";
import { useUserRoutes } from "./user";

class User extends BaseUsers<typeof userSchema> {
  getWelcomeMail() {
    return {
      title: "Willkommen",
      body: `Bitte bestätige deine Email: https://apparts.com/reset?token=${encodeURIComponent(
        this.content.tokenforreset!,
      )}&email=${encodeURIComponent(this.content.email)}&welcome=true`,
    };
  }
  getResetPWMail() {
    return {
      title: "Passwort vergessen?",
      body: `Hier kannst du dein Passwort ändern: https://apparts.com/reset?token=${encodeURIComponent(
        this.content.tokenforreset!,
      )}&email=${encodeURIComponent(this.content.email)}`,
    };
  }
  getEncryptionSettings() {
    return {
      passwordHashRounds: 10,
      cookieTokenLength: 32,
      webtokenkey: "<change me>",
      webtokenExpireTime: "10 minutes" as const,
    };
  }
}
useModel(User, { typeSchema: userSchema, collection: "users" });

import { OtherUsers } from "../../tests/otherUser";

import beTests from "@apparts/backend-test";
import testConfig from "./tests/config";
const settings = {
  Users: User,
  mail: (() => mailObj) as unknown as Mailer,
  cookie: {
    allowUnsecure: false,
    expireTime: "365 days" as const,
  },
};

const { checkType, allChecked, app, url, error, getPool } = beTests({
  testName: "user",
  apiContainer: useUserRoutes(settings),
  ...testConfig,
});
app.use((req, res, next) => {
  req.ctx = { dbs: req.dbs };
  next();
});

addRoutes({ app, ...settings });

const { updateUser: updateOtherUser, getToken: getOtherUserToken } =
  useUserRoutes({ ...settings, Users: OtherUsers });
app.put("/v/1/other/user", updateOtherUser);
app.get("/v/1/other/user/login", getOtherUserToken);

import { get as getConfig } from "@apparts/config";
const {
  apiToken: { webtokenkey, expireTime },
} = getConfig("login-config");

import JWT from "jsonwebtoken";
import { Mailer } from "types";

const jwt = (email, id, extra = {}, action = "login", expiresIn = expireTime) =>
  JWT.sign(
    {
      id,
      action,
      email,
      ...extra,
    },
    webtokenkey,
    { expiresIn },
  );

let dateNowAll;
beforeEach(() => {
  dateNowAll = jest
    .spyOn(Date, "now")
    .mockImplementation(() => 1575158400000 + 1000 * 60 * 60 * 9.7);
  const mailMock = jest.fn();
  mailObj.sendMail = mailMock;
});
afterEach(() => {
  dateNowAll.mockRestore();
  mailObj.sendMail.mockRestore();
});

const getToken = (email: string, token: string) =>
  encodeURIComponent(btoa(email + ":" + token));

describe("getToken", () => {
  test("User does not exist", async () => {
    const response = await request(app)
      .get(url("user/login"))
      .auth("doesnotexist@test.de", "a12345678");
    expect(response.body).toMatchObject(error("User not found"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getToken")).toBeTruthy();
  });
  test("Empty email address", async () => {
    const response = await request(app)
      .get(url("user/login"))
      .auth("", "a12345678");
    expect(response.body).toMatchObject(error("Authorization wrong"));
    expect(response.statusCode).toBe(400);
    expect(checkType(response, "getToken")).toBeTruthy();
  });
  test("Wrong password", async () => {
    await (
      await new User(getPool(), [{ email: "tester@test.de" }]).setPw(
        "a12345678",
      )
    ).store();

    const response = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "b12345678");
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getToken")).toBeTruthy();
  });
  test("Empty password", async () => {
    const response = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "");
    expect(response.body).toMatchObject(error("Authorization wrong"));
    expect(response.statusCode).toBe(400);
    expect(checkType(response, "getToken")).toBeTruthy();
  });
  test("Successfull login", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "a12345678");
    expect(response.body).toMatchObject({
      id: user.content.id,
      apiToken: jwt("tester@test.de", user.content.id),
    });
    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toMatchObject([
      `loginToken=${getToken(user.content.email, user.content.token!)}; Max-Age=31536000; Path=/; Expires=Mon, 30 Nov 2020 09:42:00 GMT; HttpOnly; Secure; SameSite=Strict`,
    ]);
    const token = setCookie[0].split(";")[0].split("=")[1];
    expect(atob(decodeURIComponent(token)).split(":")[0]).toBe(
      "tester@test.de",
    );
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "getToken")).toBeTruthy();
  });
  test("Successfull login with wrongly cased email", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response = await request(app)
      .get(url("user/login"))
      .auth("teSTER@test.de", "a12345678");
    expect(response.body).toMatchObject({
      id: user.content.id,
      apiToken: jwt("tester@test.de", user.content.id),
    });
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "getToken")).toBeTruthy();
  });

  test("Extra infos in token", async () => {
    class User1 extends User {
      async getExtraAPITokenContent() {
        return { tada: 4 };
      }
    }
    const { getToken } = useUserRoutes({ ...settings, Users: User1 });
    app.get("/v/1/user1/login", getToken);

    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });

    const response = await request(app)
      .get(url("user1/login"))
      .auth("tester@test.de", "a12345678");
    expect(response.body).toMatchObject({
      id: user.content.id,
      apiToken: jwt("tester@test.de", user.content.id, { tada: 4 }),
    });
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "getToken")).toBeTruthy();
  });

  it("should back off exponentilly on failed login", async () => {
    const responses = [] as unknown[];
    for (let i = 0; i < 7; i++) {
      responses.push(
        await request(app)
          .get(url("other/user/login"))
          .auth("tester@test.de", "b12345678"),
      );
    }

    responses.push(
      await request(app)
        .get(url("other/user/login"))
        // now try correct login, should fail too
        .auth("tester@test.de", "a12345678"),
    );

    expect(responses).toMatchObject([
      { statusCode: 401 },
      { statusCode: 401 },
      { statusCode: 401 },
      { statusCode: 401 },
      { statusCode: 401 },
      { statusCode: 425 },
      { statusCode: 425 },
      { statusCode: 425 },
    ]);
    for (const response of responses) {
      expect(checkType(response, "getToken")).toBeTruthy();
    }

    dateNowAll = jest
      .spyOn(Date, "now")
      .mockImplementation(() => 1575158400000 + 1000 * 60 * 60 * 9.7 * 3);

    const lastResponse = await request(app)
      .get(url("other/user/login"))
      .auth("tester@test.de", "b12345678");
    expect(lastResponse).toMatchObject({ statusCode: 401 });
    expect(checkType(lastResponse, "getToken")).toBeTruthy();
    const veryLastResponse = await request(app)
      .get(url("other/user/login"))
      .auth("tester@test.de", "b12345678");
    expect(veryLastResponse).toMatchObject({ statusCode: 425 });
    expect(checkType(veryLastResponse, "getToken")).toBeTruthy();

    dateNowAll = jest
      .spyOn(Date, "now")
      .mockImplementation(() => 1575158400000 + 1000 * 60 * 60 * 9.7);
  });
});

describe("getAPIToken", () => {
  test("User does not exist", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response = await request(app)
      .get(url("user/apiToken"))
      .set(
        "Cookie",
        `loginToken=${getToken("doesnotexist@test.de", user.content.token!)}`,
      );

    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
  test("Empty email address", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response = await request(app)
      .get(url("user/apiToken"))
      .set("Cookie", `loginToken=${getToken("", user.content.token!)}`);
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
  test("Wrong token", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });

    const response = await request(app)
      .get(url("user/apiToken"))
      .set(
        "Cookie",
        `loginToken=${getToken(user.content.email, "aorsitenrstne")}`,
      );

    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
  test("Missing cookie", async () => {
    const response = await request(app).get(url("user/apiToken"));
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
  test("Empty token", async () => {
    const response = await request(app)
      .get(url("user/apiToken"))
      .set("Cookie", `loginToken=${getToken("tester@test.de", "")}`);
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
  test("Invalid token", async () => {
    const response = await request(app)
      .get(url("user/apiToken"))
      .set("Cookie", `loginToken=%2F`);
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });

  test("Success", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response = await request(app)
      .get(url("user/apiToken"))
      .set(
        "Cookie",
        `loginToken=${getToken(user.content.email, user.content.token!)}`,
      );

    expect(response.body).toBe(jwt("tester@test.de", user.content.id));
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "getAPIToken")).toBeTruthy();
  });
  test("Extra dynamic infos in token", async () => {
    class User1 extends User {
      async getExtraAPITokenContent() {
        return { tada: 4 };
      }
    }

    const user = await new User1(getPool()).loadOne({
      email: "tester@test.de",
    });
    const response = await user.getAPIToken({
      venueId: "2",
    });
    expect(response).toBe(
      jwt("tester@test.de", user.content.id, {
        tada: 4,
        venueId: "2",
      }),
    );
  });
  test("Extra dynamic options of token", async () => {
    class User1 extends User {
      async getExtraAPITokenContent() {
        return { tada: 4 };
      }
    }
    const user = await new User1(getPool()).loadOne({
      email: "tester@test.de",
    });
    const response = await user.getAPIToken(
      {},
      {
        expiresIn: "2 days",
      },
    );
    expect(response).toBe(
      jwt(
        "tester@test.de",
        user.content.id,
        {
          tada: 4,
        },
        "login",
        "2 days",
      ),
    );
  });
  test("Call getAPIToken on invalid user", async () => {
    const user = new User(getPool(), [{}]);
    await expect(async () => await user.getAPIToken()).rejects.toThrow();
  });
});

describe("logout", () => {
  test("Missing token", async () => {
    const response = await request(app).put(url("user/logout"));
    expect(response.body).toBe("ok");
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "logout")).toBeTruthy();
  });
  test("Success", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response = await request(app)
      .put(url("user/logout"))
      .set(
        "Cookie",
        `loginToken=${getToken(user.content.email, user.content.token!)}`,
      );

    expect(response.body).toBe("ok");
    expect(response.statusCode).toBe(200);

    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toStrictEqual([
      "loginToken=%2F; Max-Age=31536000; Path=/; Expires=Mon, 30 Nov 2020 09:42:00 GMT; HttpOnly; Secure; SameSite=Strict",
    ]);

    expect(checkType(response, "logout")).toBeTruthy();
  });
});

describe("signup", () => {
  test("User exists already", async () => {
    const response = await request(app).post(url("user")).send({
      email: "tester@test.de",
    });
    expect(response.body).toMatchObject(error("User exists"));
    expect(response.statusCode).toBe(413);
    expect(checkType(response, "addUser")).toBeTruthy();
  });
  test("email invalid", async () => {
    const response = await request(app).post(url("user")).send({
      email: "tester@test",
    });
    expect(response.body).toMatchObject(
      error("Fieldmissmatch", 'expected email for field "email" in body'),
    );

    expect(response.statusCode).toBe(400);
  });
  test("Success", async () => {
    const response = await request(app).post(url("user")).send({
      email: "newuser@test.de",
    });
    expect(response.body).toBe("ok");
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "addUser")).toBeTruthy();
    const user = await new User(getPool()).loadOne({
      email: "newuser@test.de",
    });
    expect(user.content.email).toBe("newuser@test.de");
    expect(user.content.createdon).toBe(1575158400000 + 1000 * 60 * 60 * 9.7);
    expect(user.content.token).toBeTruthy();
    expect(user.content.tokenforreset).toBeTruthy();

    expect(mailObj.sendMail.mock.calls).toHaveLength(1);
    expect(mailObj.sendMail.mock.calls[0][0]).toBe("newuser@test.de");
    expect(mailObj.sendMail.mock.calls[0][1]).toBe(
      `Bitte bestätige deine Email: https://apparts.com/reset?token=${encodeURIComponent(
        user.content.tokenforreset!,
      )}&email=newuser%40test.de&welcome=true`,
    );
    expect(mailObj.sendMail.mock.calls[0][2]).toBe("Willkommen");
  });
  test("Success with extra data", async () => {
    const mockFn = jest.fn();

    class User1 extends User {
      async setExtra(extra) {
        mockFn(extra);
      }
    }
    const { addUser } = useUserRoutes({ ...settings, Users: User1 });
    app.post("/v/1/user2", addUser);

    const response = await request(app)
      .post(url("user2"))
      .send({
        email: "newuser2@test.de",
        a: 3,
        b: false,
        c: [4, 6],
      });
    expect(response.body).toBe("ok");
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "addUser")).toBeTruthy();
    const user = await new User(getPool()).loadOne({
      email: "newuser2@test.de",
    });
    expect(user.content.email).toBe("newuser2@test.de");
    expect(user.content.createdon).toBe(1575158400000 + 1000 * 60 * 60 * 9.7);
    expect(user.content.token).toBeTruthy();
    expect(user.content.tokenforreset).toBeTruthy();
    expect(mockFn.mock.calls).toHaveLength(1);
    expect(mockFn.mock.calls[0][0]).toMatchObject({
      a: 3,
      b: false,
      c: [4, 6],
    });

    expect(mailObj.sendMail.mock.calls).toHaveLength(1);
    expect(mailObj.sendMail.mock.calls[0][0]).toBe("newuser2@test.de");
    expect(mailObj.sendMail.mock.calls[0][1]).toBe(
      `Bitte bestätige deine Email: https://apparts.com/reset?token=${encodeURIComponent(
        user.content.tokenforreset!,
      )}&email=newuser2%40test.de&welcome=true`,
    );
    expect(mailObj.sendMail.mock.calls[0][2]).toBe("Willkommen");
  });
});

describe("get user", () => {
  test("User does not exist", async () => {
    const response = await request(app)
      .get(url("user"))
      .auth("doesnotexist@test.de", "a12345678");
    expect(response.body).toMatchObject(error("User not found"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getUser")).toBeTruthy();
  });
  test("Empty email address", async () => {
    const response = await request(app).get(url("user")).auth("", "a12345678");
    expect(response.body).toMatchObject(error("Authorization wrong"));
    expect(response.statusCode).toBe(400);
    expect(checkType(response, "getUser")).toBeTruthy();
  });
  test("Wrong auth", async () => {
    const response = await request(app)
      .get(url("user"))
      .auth("tester@test.de", "aorsitenrstne");
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "getUser")).toBeTruthy();
  });
  test("Success", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response = await request(app)
      .get(url("user"))
      .auth("tester@test.de", user.content.token!);
    expect(response.body).toMatchObject({
      email: "tester@test.de",
      id: user.content.id,
      createdon: 1575158400000 + 1000 * 60 * 60 * 9.7,
    });
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "getUser")).toBeTruthy();
  });
});

describe("reset password", () => {
  test("User does not exist", async () => {
    const response = await request(app).post(
      url("user/doesnotexist@test.de/reset"),
    );
    expect(response.body).toMatchObject(error("User not found"));
    expect(response.statusCode).toBe(404);
    expect(checkType(response, "resetPassword")).toBeTruthy();
  });
  test("Success", async () => {
    const userOld = await new User(getPool()).loadOne({
      email: "tester@test.de",
    });

    const response = await request(app).post(url("user/tester@test.de/reset"));
    expect(response.body).toBe("ok");
    expect(response.statusCode).toBe(200);
    expect(checkType(response, "resetPassword")).toBeTruthy();
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    expect(user.content.token).toBe(userOld.content.token);
    expect(user.content.tokenforreset).toBeTruthy();

    expect(mailObj.sendMail.mock.calls).toHaveLength(1);
    expect(mailObj.sendMail.mock.calls[0][0]).toBe("tester@test.de");
    expect(mailObj.sendMail.mock.calls[0][1]).toBe(
      `Hier kannst du dein Passwort ändern: https://apparts.com/reset?token=${encodeURIComponent(
        user.content.tokenforreset!,
      )}&email=tester%40test.de`,
    );
    expect(mailObj.sendMail.mock.calls[0][2]).toBe("Passwort vergessen?");
  });
});

describe("alter user", () => {
  test("User does not exist", async () => {
    const response = await request(app)
      .put(url("user"))
      .auth("doesnotexist@test.de", "a12345678");
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "updateUser")).toBeTruthy();
  });
  test("Empty email address", async () => {
    const response = await request(app).put(url("user")).auth("", "a12345678");
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "updateUser")).toBeTruthy();
  });
  test("Wrong auth", async () => {
    const response = await request(app)
      .put(url("user"))
      .auth("tester@test.de", "aorsitenrstne");
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "updateUser")).toBeTruthy();
  });
  test("Missing token", async () => {
    const response = await request(app)
      .put(url("user"))
      .auth("tester@test.de", "");
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "updateUser")).toBeTruthy();
  });

  test("Alter password with loginToken in cookies", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "a12345678");
    expect(response.body).toMatchObject({
      id: user.content.id,
      apiToken: jwt("tester@test.de", user.content.id),
    });
    const response2 = await request(app)
      .put(url("user"))
      .set(
        "Cookie",
        `loginToken=${getToken(user.content.email, user.content.token!)}`,
      )
      .send({ password: "jkl123a9a##" });
    expect(response2.statusCode).toBe(200);
    const usernew = await new User(getPool()).loadOne({
      email: "tester@test.de",
    });
    expect(usernew.content.token === user.content.token).toBeFalsy();
    expect(response2.body).toMatchObject({
      id: user.content.id,
      apiToken: jwt("tester@test.de", user.content.id),
    });
    const response3 = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "a12345678");
    expect(response3.statusCode).toBe(401);
    const response4 = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "jkl123a9a##");
    expect(response4.body).toMatchObject({
      id: user.content.id,
      apiToken: jwt("tester@test.de", user.content.id),
    });
    const setCookie = response.headers["set-cookie"];
    expect(setCookie).toMatchObject([
      `loginToken=${getToken(user.content.email, user.content.token!)}; Max-Age=31536000; Path=/; Expires=Mon, 30 Nov 2020 09:42:00 GMT; HttpOnly; Secure; SameSite=Strict`,
    ]);

    expect(checkType(response2, "updateUser")).toBeTruthy();
  });

  test("Alter password with resetToken", async () => {
    await request(app).post(url("user/tester@test.de/reset"));
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response2 = await request(app)
      .put(url("user"))
      .auth("tester@test.de", user.content.tokenforreset!)
      .send({ password: "?aoRisetn39!!" });
    expect(response2.statusCode).toBe(200);
    const usernew = await new User(getPool()).loadOne({
      email: "tester@test.de",
    });
    expect(usernew.content.token === user.content.token).toBeFalsy();
    expect(response2.body).toMatchObject({
      id: user.content.id,
      apiToken: jwt("tester@test.de", user.content.id),
    });
    const response3 = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "jkl123a9a##");
    expect(response3.statusCode).toBe(401);
    const response4 = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "?aoRisetn39!!");
    expect(response4.body).toMatchObject({
      id: user.content.id,
      apiToken: jwt("tester@test.de", user.content.id),
    });

    expect(checkType(response2, "updateUser")).toBeTruthy();
  });

  test("Refuses to alter password if password does not meet requirements", async () => {
    await request(app).post(url("user/tester@test.de/reset"));
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });

    const response2 = await request(app)
      .put(url("other/user"))
      .auth("tester@test.de", user.content.tokenforreset!)
      .send({ password: "?aoR!!" });
    expect(response2.statusCode).toBe(400);
    expect(response2.body).toMatchObject({
      description: "Password must be 10+ characters",
      error: "The new password does not meet all requirements",
    });
    expect(checkType(response2, "updateUser")).toBeTruthy();
  });

  test("Don't alter anything", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response2 = await request(app)
      .put(url("user"))
      .auth("tester@test.de", user.content.token!)
      .send({});
    expect(response2.statusCode).toBe(400);
    expect(response2.body).toMatchObject({
      error: "Nothing to update",
    });
    const usernew = await new User(getPool()).loadOne({
      email: "tester@test.de",
    });
    expect(usernew.content).toMatchObject(user.content);

    expect(checkType(response2, "updateUser")).toBeTruthy();
  });
  test("Omit password on pw reset", async () => {
    await request(app).post(url("user/tester@test.de/reset"));
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response2 = await request(app)
      .put(url("user"))
      .auth("tester@test.de", user.content.tokenforreset!)
      .send({});
    expect(response2.statusCode).toBe(400);
    expect(response2.body).toMatchObject({
      error: "Nothing to update",
    });
    const usernew = await new User(getPool()).loadOne({
      email: "tester@test.de",
    });
    expect(usernew.content).toMatchObject({
      ...user.content,
      tokenforreset: null,
    });

    expect(checkType(response2, "updateUser")).toBeTruthy();
  });
});

describe("delete user", () => {
  test("User does not exist", async () => {
    const response = await request(app)
      .del(url("user"))
      .auth("doesnotexist@test.de", "a12345678");
    expect(response.body).toMatchObject(error("User not found"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "deleteUser")).toBeTruthy();
  });
  test("Empty email address", async () => {
    const response = await request(app).del(url("user")).auth("", "a12345678");
    expect(response.body).toMatchObject(error("Authorization wrong"));
    expect(response.statusCode).toBe(400);
    expect(checkType(response, "deleteUser")).toBeTruthy();
  });
  test("Wrong auth", async () => {
    const response = await request(app)
      .del(url("user"))
      .auth("tester@test.de", "aorsitenrstne");
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "deleteUser")).toBeTruthy();
  });
  test("Missing token", async () => {
    const response = await request(app)
      .del(url("user"))
      .auth("tester@test.de", "");
    expect(response.body).toMatchObject(error("Authorization wrong"));
    expect(response.statusCode).toBe(400);
    expect(checkType(response, "deleteUser")).toBeTruthy();
  });
  test("Token login", async () => {
    const user = await new User(getPool()).loadOne({ email: "tester@test.de" });
    const response = await request(app)
      .del(url("user"))
      .auth("tester@test.de", user.content.token!);
    expect(response.body).toMatchObject(error("Unauthorized"));
    expect(response.statusCode).toBe(401);
    expect(checkType(response, "deleteUser")).toBeTruthy();
  });
  test("Delete user", async () => {
    await new User(getPool()).loadOne({ email: "tester@test.de" });

    const response1 = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "?aoRisetn39!!");
    expect(response1.statusCode).toBe(200);
    const response = await request(app)
      .del(url("user"))
      .auth("tester@test.de", "?aoRisetn39!!");
    expect(response.body).toBe("ok");
    const response3 = await request(app)
      .get(url("user/login"))
      .auth("tester@test.de", "?aoRisetn39!!");
    expect(response3.body).toMatchObject(error("User not found"));
    expect(response3.statusCode).toBe(401);

    const response4 = await request(app).post(url("user/tester@test.de/reset"));
    expect(response4.body).toMatchObject(error("User not found"));
    expect(response4.statusCode).toBe(404);

    expect(checkType(response, "deleteUser")).toBeTruthy();
  });
});

describe("All possible responses tested", () => {
  test("", () => {
    expect(allChecked("getToken")).toBeTruthy();
    expect(allChecked("getAPIToken")).toBeTruthy();
    expect(allChecked("addUser")).toBeTruthy();
    expect(allChecked("getUser")).toBeTruthy();
    expect(allChecked("resetPassword")).toBeTruthy();
    expect(allChecked("updateUser")).toBeTruthy();
    expect(allChecked("deleteUser")).toBeTruthy();
    expect(allChecked("logout")).toBeTruthy();
  });
});
