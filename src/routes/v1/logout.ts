import { prepare } from "@apparts/prep";
import * as types from "@apparts/types";
import { UseUserRoutesProps } from "../../types";
import { setCookie } from "./utils/cookie";
import { getUserFromCookie } from "./utils/getUserFrom";

export const logout = (props: UseUserRoutesProps) =>
  prepare(
    {
      title: "Logout",
      receives: {},
      returns: [types.value("ok")],
      hasAccess: async () => true,
    },
    async (req, res) => {
      try {
        const { user, token } = await getUserFromCookie(req, props.Users);
        await user.invalidateSession(token);
      } catch {
        // ignore errors
      }

      setCookie(res, "/", props.cookie);
      return "ok" as const;
    },
  );
