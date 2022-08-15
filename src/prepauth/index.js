const { prepare, HttpError, httpErrorSchema } = require("@apparts/prep");
const { basicAuth } = require("./authorizationHeader.js");
const { NotFound } = require("@apparts/model");

const _prepauth = (options, fun, usePw, User) => {
  return prepare(options, async (req, res) => {
    const [email, token] = basicAuth(req);
    if (!email || !token) {
      return new HttpError(400, "Authorization wrong");
    }
    const user = new User(req.dbs);
    try {
      await user.load({ email: email.toLowerCase(), deleted: false });
      if (usePw) {
        await user.checkAuthPw(token);
      } else {
        await user.checkAuth(token);
      }
    } catch (e) {
      if (e instanceof NotFound) {
        return new HttpError(401, "User not found");
      }
      throw e;
    }
    return fun(req, user, res);
  });
};
_prepauth.returns = [
  httpErrorSchema(401, "User not found"),
  httpErrorSchema(400, "Authorization wrong"),
];

const prepauthToken = (User) => (options, fun) => {
  return _prepauth(
    {
      ...options,
      auth: "Basic btoa(uname:token)",
      returns: [...(options.returns || []), ...prepauthToken.returns],
    },
    fun,
    false,
    User
  );
};
prepauthToken.returns = _prepauth.returns;

const prepauthPW = (User) => (options, fun) => {
  return _prepauth(
    {
      ...options,
      auth: "Basic btoa(uname:password)",
      returns: [...(options.returns || []), ...prepauthPW.returns],
    },
    fun,
    true,
    User
  );
};
prepauthPW.returns = _prepauth.returns;

module.exports = { prepauthToken, prepauthPW };
