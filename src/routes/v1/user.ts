import { prepare, HttpError, httpErrorSchema } from "@apparts/prep";
import {
  prepauthPW as prepauthPW_,
  prepauthToken as prepauthToken_,
} from "../../prepauth";
import { NotFound, NotUnique } from "@apparts/model";
import { get as getConfig } from "@apparts/config";
import { PasswordNotValidError } from "../../errors";
import * as types from "@apparts/types";
import { UseUserType } from "model/user";

const UserSettings = getConfig("login-config");

const makeFakeSchema = (type) =>
  ({
    getType() {
      return type;
    },
    getModelType() {
      return type;
    },
  }) as types.Obj<any, any>;

export const useUserRoutes = (
  User: UseUserType,
  mail,
  settings = UserSettings,
) => {
  const prepauthPW = prepauthPW_(User);
  const prepauthToken = prepauthToken_(User);
  const addUser = prepare(
    {
      title: "Add a user",
      receives: {
        body: makeFakeSchema({
          email: { type: "email" },
          ...settings.extraTypes,
        }),
      },
      returns: [types.value("ok"), httpErrorSchema(413, "User exists")],
      hasAccess: async () => true,
    },
    // @ts-ignore
    async ({ ctx: { dbs }, body: { email, ...extra } }) => {
      const me = new User(dbs, [
        {
          email: email.toLowerCase(),
        },
      ]);

      await me.setExtra(extra);
      await me.genResetToken();
      try {
        await me.store();
      } catch (e) {
        if (e instanceof NotUnique) {
          return new HttpError(413, "User exists");
        }
        throw e;
      }
      const { title, body } = me.getWelcomeMail();
      await mail.sendMail(email, body, title);
      return "ok";
    },
  );

  const getUser = prepauthToken(
    {
      title: "Get a user",
      receives: {},
      returns: [
        makeFakeSchema({ type: "object", values: { type: "/" } }),
        httpErrorSchema(401, "Unauthorized"),
      ],
      hasAccess: async () => true,
    },
    async (_, me: InstanceType<UseUserType>) => {
      return (await me.getPublic())[0];
    },
  );

  const getToken = prepauthPW(
    {
      title: "Login",
      receives: {},
      returns: [
        makeFakeSchema({
          type: "object",
          keys: {
            id: { type: "string" },
            loginToken: { type: "base64" },
            apiToken: { type: "string" },
          },
        }),
        httpErrorSchema(401, "Unauthorized"),
        httpErrorSchema(425, "Login failed, too often."),
      ],
      hasAccess: async () => true,
    },
    async (req, me) => {
      const apiToken = await me.getAPIToken();
      return {
        id: me.content.id,
        loginToken: me.content.token,
        apiToken,
      };
    },
  );

  const getAPIToken = prepauthToken(
    {
      title: "Renew API Token",
      receives: {},
      returns: [
        makeFakeSchema({
          type: "string",
        }),
        httpErrorSchema(401, "Unauthorized"),
      ],
      hasAccess: async () => true,
    },
    async (req, me) => {
      const apiToken = await me.getAPIToken();
      return apiToken;
    },
  );

  const deleteUser = prepauthPW(
    {
      title: "Delete a user",
      receives: {},
      returns: [types.value("ok"), httpErrorSchema(401, "Unauthorized")],
      hasAccess: async () => true,
    },
    async (_, me) => {
      await me.deleteMe();
      return "ok" as const;
    },
  );

  const updateUser = prepauthToken(
    {
      title: "Update a user",
      description: "Currently, only updating the password is supported.",
      receives: {
        body: types.obj({
          password: types.string().semantic("password").optional(),
        }),
      },
      returns: [
        makeFakeSchema({
          type: "object",
          keys: {
            id: { type: "string" },
            loginToken: { type: "base64" },
            apiToken: { type: "string" },
          },
        }),
        httpErrorSchema(400, "Nothing to update"),
        httpErrorSchema(400, "Password required"),
        httpErrorSchema(400, "The new password does not meet all requirements"),
        httpErrorSchema(401, "Unauthorized"),
      ],
      hasAccess: async () => true,
    },
    async ({ body: { password } }, me) => {
      if (me.resetTokenUsed) {
        if (!password) {
          return new HttpError(400, "Password required");
        }
      }

      if (!password) {
        return new HttpError(400, "Nothing to update");
      }

      /* istanbul ignore else */
      if (password) {
        try {
          await me.setPw(password);
        } catch (e) {
          if (e instanceof PasswordNotValidError) {
            return new HttpError(
              400,
              "The new password does not meet all requirements",
              e.message,
            );
          }
          throw e;
        }
        await me.genToken();
      }

      me.content.tokenforreset = null;
      await me.update();
      const apiToken = await me.getAPIToken();
      return {
        id: me.content.id,
        loginToken: me.content.token,
        apiToken,
      };
    },
  );

  const resetPassword = prepare(
    {
      title: "Reset the password",
      receives: {
        params: makeFakeSchema({
          email: { type: "email" },
        }),
      },
      returns: [httpErrorSchema(404, "User not found"), types.value("ok")],
      hasAccess: async () => true,
    },
    // @ts-ignore
    async ({ ctx: { dbs }, params: { email } }) => {
      const me = new User(dbs);
      try {
        await me.loadOne({ email: email.toLowerCase(), deleted: false });
      } catch (e) {
        if (e instanceof NotFound) {
          return new HttpError(404, "User not found");
        }
        throw e;
      }
      await me.genResetToken();

      await me.update();

      const { title, body } = me.getResetPWMail();
      await mail.sendMail(email, body, title);

      return "ok";
    },
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
