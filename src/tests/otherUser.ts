import {
  createUserModel,
  createLoginsModel,
  PasswordNotValidError,
  checkAuthPwExponential,
} from "../";

const Login = createLoginsModel({});

const Users = createUserModel({}, "users");

class OtherUsers extends Users {
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
      Login,
      this.content.id,
      password,
      async (password) => {
        await super.checkAuthPw(password);
      },
    );
    return this;
  }
}

module.exports = OtherUsers;
