import { prepare, HttpError, httpErrorSchema } from "@apparts/prep";
import {
  prepauthPW as prepauthPW_,
  prepauthToken as prepauthToken_,
} from "../../prepauth";
import { NotFound, NotUnique } from "@apparts/model";
import { get as getConfig } from "@apparts/config";
import { PasswordNotValidError } from "../../errors";
import * as types from "@apparts/types";
import { UserConstructorType } from "model/user";
import { Mailer } from "types";
import ms, { StringValue } from "ms";
import { decodeCookie } from "./cookie";
import { basicAuth } from "./../../prepauth/authorizationHeader";

const UserSettings = getConfig("login-config");

const makeFakeSchema = (type) =>
  ({
    getType() {
      return type;
    },
    getModelType() {
      return type;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as types.Obj<any, any>;

export const useUserRoutes = (
  User: UserConstructorType,
  mail: Mailer,
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
    // @ts-expect-error 2339
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
        types.objValues(types.any()),
        httpErrorSchema(401, "Unauthorized"),
      ],
      hasAccess: async () => true,
    },
    async (_, me: InstanceType<UserConstructorType>) => {
      return (await me.getPublic())[0];
    },
  );

  const getToken = prepauthPW(
    {
      title: "Login",
      receives: {},
      returns: [
        types.obj({
          id: types.string(),
          apiToken: types.string(),
        }),
        httpErrorSchema(401, "Unauthorized"),
        httpErrorSchema(425, "Login failed, too often."),
      ],
      hasAccess: async () => true,
    },
    async (_, me, res) => {
      const apiToken = await me.getAPIToken();
      res.cookie(
        "loginToken",
        btoa(me.content.email + ":" + me.content.token),
        {
          httpOnly: true,
          secure: !settings.cookie.allowUnsecure,
          sameSite: "strict",
          maxAge: ms(String(settings.cookie.expireTime) as StringValue),
        },
      );
      return {
        id: me.content.id,
        apiToken,
      };
    },
  );

  const logout = prepare(
    {
      title: "Logout",
      receives: {},
      returns: [types.value("ok")],
      hasAccess: async () => true,
    },
    async (_, res) => {
      res.cookie("loginToken", "/", {
        httpOnly: true,
        secure: !settings.cookie.allowUnsecure,
        sameSite: "strict",
        maxAge: ms(String(settings.cookie.expireTime) as StringValue),
      });
      return "ok" as const;
    },
  );

  const getAPIToken = prepare(
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
    async (req) => {
      const cookieContent = decodeCookie(req.headers.cookie ?? "");

      if (!cookieContent) {
        return new HttpError(401, "Unauthorized");
      }
      const [email, loginToken] = cookieContent;

      // @ts-expect-error 2339
      const dbs = req.ctx.dbs;
      try {
        const me = await new User(dbs).loadOne({ email, token: loginToken });
        const apiToken = await me.getAPIToken();
        return apiToken;
      } catch (e) {
        if (e instanceof NotFound || e instanceof NotUnique) {
          return new HttpError(401, "Unauthorized");
        }
        throw e;
      }
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

  const updateUser = prepare(
    {
      title: "Update a user",
      description: "Currently, only updating the password is supported.",
      receives: {
        body: types.obj({
          password: types.string().semantic("password").optional(),
        }),
      },
      returns: [
        types.obj({
          id: types.string(),
          apiToken: types.string(),
        }),
        httpErrorSchema(400, "Nothing to update"),
        httpErrorSchema(400, "The new password does not meet all requirements"),
        httpErrorSchema(401, "Unauthorized"),
      ],
      hasAccess: async () => true,
    },
    async (req) => {
      const cookieContent = decodeCookie(req.headers.cookie ?? "");

      // @ts-expect-error 2339
      const dbs = req.ctx.dbs;
      const me = new User(dbs);

      try {
        if (cookieContent) {
          const [email, loginToken] = cookieContent;
          await me.loadOne({ email });
          await me.checkAuth(loginToken);
        } else {
          const [email, tokenForReset] = basicAuth(req);
          await me.loadOne({ email });
          await me.checkAuth(tokenForReset);
        }
      } catch (e) {
        return new HttpError(401, "Unauthorized");
      }

      if (!me.isOne) {
        return new HttpError(401, "Unauthorized");
      }

      const { password } = req.body;
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

      me.content.tokenforreset = undefined;
      await me.update();
      const apiToken = await me.getAPIToken();
      return {
        id: me.content.id,
        apiToken,
      };
    },
  );

  const resetPassword = prepare(
    {
      title: "Reset the password",
      receives: {
        params: types.obj({
          email: types.email(),
        }),
      },
      returns: [httpErrorSchema(404, "User not found"), types.value("ok")],
      hasAccess: async () => true,
    },
    // @ts-expect-error 2339
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
    logout,
  };
};
