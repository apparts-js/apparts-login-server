import { GenericDBS } from "@apparts/db";
import { useModel } from "@apparts/model";
import * as types from "@apparts/types";
import { BaseUsers, userSchema } from "./user";

const fakeDbs = {} as GenericDBS;

describe("user model", () => {
  it("should createUserModel", () => {
    class Users extends BaseUsers<typeof userSchema> {
      getWelcomeMail() {
        return {
          title: "Willkommen",
          body: "",
        };
      }
      getResetPWMail() {
        return {
          title: "Passwort vergessen?",
          body: "",
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
    useModel(Users, { typeSchema: userSchema, collection: "users" });

    const u = new Users(fakeDbs, [{ email: "test@test.de" }]);
    expect(u.content).toMatchObject({ email: "test@test.de" });

    // @ts-expect-error lastName too much
    new Users(fakeDbs, [{ email: "test@test.de", lastName: "test" }]);
  });

  it("should createUserModel with extra types", () => {
    const customUserSchema = types.obj({
      ...userSchema.getKeys(),
      lastName: types.string().public(),
      permissions: types.obj({}),
    });

    class Users extends BaseUsers<typeof customUserSchema> {
      getWelcomeMail() {
        return {
          title: "Willkommen",
          body: "",
        };
      }
      getResetPWMail() {
        return {
          title: "Passwort vergessen?",
          body: "",
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
    useModel(Users, { typeSchema: customUserSchema, collection: "users" });

    const u = new Users(fakeDbs, [{ email: "test@test.de", lastName: "test" }]);
    expect(u.content).toMatchObject({
      email: "test@test.de",
      lastName: "test",
    });

    // @ts-expect-error foo too much
    new Users(fakeDbs, [{ email: "test@test.de", foo: "test" }]);
  });
});
