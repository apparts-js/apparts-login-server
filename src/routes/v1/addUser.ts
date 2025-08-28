import { NotUnique } from "@apparts/model";
import { HttpError, httpErrorSchema, prepare } from "@apparts/prep";
import * as types from "@apparts/types";
import { UseUserRoutesProps } from "../../types";
import { makeFakeSchema } from "./utils/makeFakeSchema";

export const addUser = (props: UseUserRoutesProps) =>
  prepare(
    {
      title: "Add a user",
      receives: {
        body: makeFakeSchema({
          email: { type: "email" },
          ...props.extraTypes,
        }),
      },
      returns: [types.value("ok"), httpErrorSchema(413, "User exists")],
      hasAccess: async () => true,
    },
    // @ts-expect-error 2339
    async ({ ctx, body: { email, ...extra } }) => {
      const me = new props.Users(ctx.dbs, [
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
      await props.mail(ctx).sendMail(email, body, title);
      return "ok";
    },
  );
