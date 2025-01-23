import { BaseModel, useModel } from "@apparts/model";
import { v7 as uuid } from "uuid";
import * as types from "@apparts/types";

export const loginSchema = types.obj({
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

export class BaseLogins<
  Schema extends typeof loginSchema,
> extends BaseModel<Schema> {}
useModel(BaseLogins, { typeSchema: loginSchema, collection: "logins" });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoginConstructorType = new (...ps: any[]) => BaseLogins<any>;
