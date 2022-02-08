"use strict";

const {
  preparator,
  prepauthPW: prepauthPW_,
  prepauthToken: prepauthToken_,
} = require("@apparts/types");
const { HttpError, exceptionTo } = require("@apparts/error");
const { NotFound, DoesExist } = require("@apparts/model");
const UserSettings = require("@apparts/config").get("login-config");

const useUserRoutes = (useUser, mail) => {
  const prepauthPW = prepauthPW_(useUser()[1]);
  const prepauthToken = prepauthToken_(useUser()[1]);
  const addUser = preparator(
    {
      body: {
        email: { type: "email" },
        ...UserSettings.extraTypes,
      },
    },
    async ({ dbs, body: { email, ...extra } }) => {
      const [, User] = useUser(dbs);
      const me = new User({
        email: email.toLowerCase(),
      });

      await me.setExtra(extra);
      await me.genResetToken();
      try {
        await me.store();
      } catch (e) {
        return exceptionTo(DoesExist, e, new HttpError(413, "User exists"));
      }
      const { title, body } = me.getWelcomeMail();
      await mail.sendMail(email, body, title);
      return "ok";
    },
    {
      title: "Add a user",
      returns: [
        { status: 200, value: "ok" },
        { status: 413, error: "User exists" },
      ],
    }
  );

  const getUser = prepauthToken(
    {},
    async (_, me) => {
      return me.getPublic();
    },
    {
      title: "Get a user",
      returns: [
        { status: 200, type: "object", values: { type: "/" } },
        { status: 401, error: "Unauthorized" },
      ],
    }
  );

  const getToken = prepauthPW(
    {},
    async (req, me) => {
      const apiToken = await me.getAPIToken();
      return {
        id: me.content.id,
        loginToken: me.content.token,
        apiToken,
      };
    },
    {
      title: "Login",
      returns: [
        {
          status: 200,
          type: "object",
          keys: {
            id: { type: "id" },
            loginToken: { type: "base64" },
            apiToken: { type: "string" },
          },
        },
        { status: 401, error: "Unauthorized" },
      ],
    }
  );

  const getAPIToken = prepauthToken(
    {},
    async (req, me) => {
      const apiToken = await me.getAPIToken();
      return apiToken;
    },
    {
      title: "Renew API Token",
      returns: [
        {
          status: 200,
          type: "string",
        },
        { status: 401, error: "Unauthorized" },
      ],
    }
  );

  const deleteUser = prepauthPW(
    {},
    async (_, me) => {
      await me.deleteMe();
      return "ok";
    },
    {
      title: "Delete a user",
      returns: [
        { status: 200, value: "ok" },
        { status: 401, error: "Unauthorized" },
      ],
    }
  );

  const updateUser = prepauthToken(
    {
      body: {
        password: { type: "password", optional: true },
      },
    },
    async ({ body: { password } }, me) => {
      if (me.resetTokenUsed) {
        if (!password) {
          return new HttpError(400, "Password required");
        }
        me.content.tokenforreset = null;
      }

      if (!password) {
        return new HttpError(400, "Nothing to update");
      }

      /* istanbul ignore else */
      if (password) {
        await me.setPw(password);
        await me.genToken();
      }
      /* if (email) {
        try {
          await new NoUser().loadNone({ email: email.toLowerCase() });
          me.content.email = email.toLowerCase();
        } catch (e) {
          return exceptionTo(
            DoesExist,
            e,
            new HttpError(400, "Email exists already")
          );
        }
      }*/
      await me.update();
      const apiToken = await me.getAPIToken();
      return {
        id: me.content.id,
        loginToken: me.content.token,
        apiToken,
      };
    },
    {
      title: "Update a user",
      description: "Currently, only updating the password is supported.",
      returns: [
        {
          status: 200,
          type: "object",
          keys: {
            id: { type: "id" },
            loginToken: { type: "base64" },
            apiToken: { type: "string" },
          },
        },
        { status: 400, error: "Nothing to update" },
        { status: 400, error: "Password required" },
        { status: 401, error: "Unauthorized" },
      ],
    }
  );

  const resetPassword = preparator(
    {
      params: {
        email: { type: "email" },
      },
    },
    async ({ dbs, params: { email } }) => {
      const [, User] = useUser(dbs);

      const me = new User();
      try {
        await me.load({ email: email.toLowerCase(), deleted: false });
      } catch (e) {
        return exceptionTo(NotFound, e, HttpError.notFound("User"));
      }
      await me.genResetToken();

      await me.update();

      const { title, body } = me.getResetPWMail();
      await mail.sendMail(email, body, title);

      return "ok";
    },
    {
      title: "Reset the password",
      returns: [
        { status: 404, error: "User not found" },
        { status: 200, value: "ok" },
      ],
    }
  );

  return {
    addUser,
    getUser,
    getToken,
    getAPIToken,
    deleteUser,
    updateUser,
    resetPassword,
  };
};

module.exports = useUserRoutes;
