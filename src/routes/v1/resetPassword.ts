import { NotFound } from "@apparts/model";
import { HttpError, httpErrorSchema, prepare } from "@apparts/prep";
import * as types from "@apparts/types";
import { UseUserRoutesProps } from "../../types";

export const resetPassword = (props: UseUserRoutesProps) =>
  prepare(
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
    async ({ ctx, params: { email } }) => {
      const me = new props.Users(ctx.dbs);
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
      await props.mail(ctx).sendMail(email, body, title);

      return "ok";
    },
  );
