import { httpErrorSchema } from "@apparts/prep";
import * as types from "@apparts/types";
import { UserConstructorType } from "model/user";
import { prepauthToken } from "../../prepauth";
import { UseUserRoutesProps } from "../../types";

export const getUser = (props: UseUserRoutesProps) =>
  prepauthToken(props.Users)(
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
