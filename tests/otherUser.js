const { makeModel } = require("@apparts/model");
const { createUseUser, PasswordNotValidError } = require("../");
const { Users, User, NoUser } = createUseUser({}, "users");

class _OtherUser extends User {
  async setPw(password) {
    if (password.length < 10) {
      throw new PasswordNotValidError("Password must be 10+ characters");
    }
    await super.setPw(password);
    return this;
  }
}

const {
  Users: OtherUsers,
  User: OtherUser,
  NoUser: NoOtherUser,
  useUser: useOtherUser,
} = makeModel("User", [Users, _OtherUser, NoUser]);

module.exports = { OtherUsers, OtherUser, NoOtherUser, useOtherUser };
