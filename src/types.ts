import * as types from "@apparts/types";
import { GenericDBS } from "@apparts/db";
import { BodyObj, ParamsObj, QueryObj, RequestType } from "@apparts/prep";
import { StringValue } from "ms";
import { UserConstructorType } from "model/user";

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
  cookie: {
    allowUnsecure: boolean;
    expireTime: number | StringValue;
  };
};
