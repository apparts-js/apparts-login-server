import { BaseModel } from "@apparts/model";
import { v7 as uuid } from "uuid";
import * as types from "@apparts/types";

export const sessionSchema = types.obj({
  id: types
    .string()
    .semantic("id")
    .public()
    .default(() => uuid())
    .key(),
  created: types
    .int()
    .semantic("time")
    .default(() => Date.now())
    .public()
    .readOnly(),
  userId: types.string().public().readOnly(),
  token: types.base64(),
  valid: types.boolean().default(true).readOnly(),
  details: types
    .obj({
      ip: types.string().optional(),
      browser: types.string().optional(),
      os: types.string().optional(),
    })
    .public()
    .readOnly(),
});
export type SessionType = types.InferType<typeof sessionSchema>;

export class BaseSessions<
  Schema extends typeof sessionSchema,
> extends BaseModel<Schema> {}

export type SessionConstructorType = new (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...ps: any[]
) => BaseSessions<typeof sessionSchema>;
