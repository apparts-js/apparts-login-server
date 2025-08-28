import { HttpError, httpErrorSchema, prepare } from "@apparts/prep";
import * as types from "@apparts/types";
import { PasswordNotValidError } from "../../errors";
import { UseUserRoutesProps } from "../../types";
import { encodeTokenForCookie, setCookie } from "./utils/cookie";
import { getUserFromAny } from "./utils/getUserFrom";
import { sessionDetailsFromRequest } from "./utils/sessionDetails";

export const updateUser = (props: UseUserRoutesProps) =>
  prepare(
    {
      title: "Update a user",
      description: "Currently, only updating the password is supported.",
      receives: {
        body: types.obj({
          password: types.string().semantic("password").optional(),
          invalidateSessions: types.boolean().optional(),
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
    async (req, res) => {
      const {
        user,
        token: _token,
        isReset,
      } = await getUserFromAny(req, props.Users);
      let token = _token;

      const { password, invalidateSessions } = req.body;
      if (!password) {
        return new HttpError(400, "Nothing to update");
      }

      /* istanbul ignore else */
      if (password) {
        try {
          await user.setPw(password);
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
      }
      if (invalidateSessions) {
        await user.invalidateAllSessions();
      }
      if (!token || isReset || invalidateSessions) {
        token = await user.createSession(sessionDetailsFromRequest(req));
      }
      user.content.tokenForReset = undefined;
      await user.update();
      const apiToken = await user.getAPIToken();
      setCookie(
        res,
        encodeTokenForCookie(user.content.email, token),
        props.cookie,
      );
      return {
        id: user.content.id,
        apiToken,
      };
    },
  );
