const { makeModel } = require("@apparts/model");
const {
  createUseUser,
  createUseLogins,
  PasswordNotValidError,
  checkAuthPwExponential,
} = require("../");

const Login = createUseLogins();

const Users = createUseUser({}, "users");

class OtherUsers extends Users {
  async setPw(password) {
    if (password.length < 10) {
      throw new PasswordNotValidError("Password must be 10+ characters");
    }
    await super.setPw(password);
    return this;
  }

  checkAuthPw(password) {
    return checkAuthPwExponential(
      this._dbs,
      Login,
      this.content.id,
      password,
      (password) => super.checkAuthPw(password),
    );
  }
}

module.exports = OtherUsers;
