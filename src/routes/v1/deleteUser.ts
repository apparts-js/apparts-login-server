import { httpErrorSchema } from "@apparts/prep";
import * as types from "@apparts/types";
import { prepauthPW } from "../../prepauth";
import { UseUserRoutesProps } from "../../types";

export const deleteUser = (props: UseUserRoutesProps) =>
  prepauthPW(props.Users)(
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
