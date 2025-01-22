import { useModel, makeModel } from "@apparts/model";
import { v7 as uuid } from "uuid";
import * as types from "@apparts/types";

const loginSchema = types.obj({
  id: types
    .string()
    // .semantic("id")
    .public()
    .default(() => uuid())
    .key(),
  created: types
    .int()
    .semantic("time")
    .default(() => Date.now())
    .public(),
  userId: types.string().public(),
  success: types.boolean().public().optional(),
});
export type LoginType = types.InferType<typeof loginSchema>;

export default (types, collectionName = "logins") => {
  const [Logins, Login, NoLogin] = useModel(
    {
      ...loginSchema.getModelType(),
      ...types,
    },
    collectionName,
  );

  return makeModel("Login", [Logins, Login, NoLogin]);
};
