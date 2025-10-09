import * as types from "@apparts/types";
import { GenericDBS } from "@apparts/db";
import {
  BodyObj,
  ParamsObj,
  QueryObj,
  RequestType,
  OptionsType,
} from "@apparts/prep";
import { StringValue } from "ms";
import { UserConstructorType } from "./model/user";

export type ActualRequestType<
  BodyType extends BodyObj,
  ParamsType extends ParamsObj,
  QueryType extends QueryObj,
> = RequestType<BodyType, ParamsType, QueryType> & {
  ctx: {
    dbs: GenericDBS;
  };
};

export type Mailer = (ctx: { dbs: GenericDBS }) => {
  sendMail: (email: string, body: string, title: string) => Promise<void>;
};

export type UseUserRoutesProps = {
  Users: UserConstructorType;
  mail: Mailer;
  extraTypes?: Record<string, types.Type>;
  prepOptions?: Omit<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OptionsType<any, any, any, any, any>,
    "receives" | "returns" | "title" | "hasAccess" | "auth"
  >;
  cookie: {
    allowUnsecure: boolean;
    expireTime: number | StringValue;
  };
};
