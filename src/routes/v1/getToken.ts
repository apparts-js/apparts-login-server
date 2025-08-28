import { httpErrorSchema } from "@apparts/prep";
import * as types from "@apparts/types";
import { prepauthPW } from "../../prepauth";
import { UseUserRoutesProps } from "../../types";
import { encodeTokenForCookie, setCookie } from "./utils/cookie";
import { sessionDetailsFromRequest } from "./utils/sessionDetails";

export const getToken = (props: UseUserRoutesProps) =>
  prepauthPW(props.Users)(
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
    async (req, me, res) => {
      const token = await me.createSession(sessionDetailsFromRequest(req));
      const apiToken = await me.getAPIToken();
      setCookie(
        res,
        encodeTokenForCookie(me.content.email, token),
        props.cookie,
      );
      return {
        id: me.content.id,
        apiToken,
      };
    },
  );
