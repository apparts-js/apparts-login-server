import { useModel } from "@apparts/model";
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

export const createUseLogins = (types, collectionName = "logins") => {
  const Logins = useModel({
    typeSchema: loginSchema,
    collection: collectionName,
  });

  return Logins;
};

export type UseLoginsType = ReturnType<typeof createUseLogins>;
