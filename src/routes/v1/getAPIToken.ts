import { NotFound, NotUnique } from "@apparts/model";
import { HttpError, httpErrorSchema, prepare } from "@apparts/prep";
import { UseUserRoutesProps } from "../../types";
import { decodeCookie } from "./utils/cookie";

import { makeFakeSchema } from "./utils/makeFakeSchema";

export const getAPIToken = (props: UseUserRoutesProps) =>
  prepare(
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
        const me = await new props.Users(dbs).loadBySessionToken(
          email,
          loginToken,
        );

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
