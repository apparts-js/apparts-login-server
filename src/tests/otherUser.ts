import {
  BaseUsers,
  userSchema,
  BaseLogins,
  loginSchema,
  PasswordNotValidError,
  checkAuthPwExponential,
} from "../";
import { useModel } from "@apparts/model";

export class Logins extends BaseLogins<typeof loginSchema> {}

export class OtherUsers extends BaseUsers<typeof userSchema> {
  async setPw(password: string) {
    if (password.length < 10) {
      throw new PasswordNotValidError("Password must be 10+ characters");
    }
    await super.setPw(password);
    return this;
  }

  async checkAuthPw(password: string) {
    await checkAuthPwExponential(
      this._dbs,
      Logins,
      this.content.id,
      password,
      async (password) => {
        await super.checkAuthPw(password);
      },
    );
    return this;
  }
}
useModel(OtherUsers, { typeSchema: userSchema, collection: "users" });
