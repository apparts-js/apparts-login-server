import { GenericDBS } from "@apparts/db";
import { BodyObj, ParamsObj, QueryObj, RequestType } from "@apparts/prep";

export type ActualRequestType<
  BodyType extends BodyObj,
  ParamsType extends ParamsObj,
  QueryType extends QueryObj,
> = RequestType<BodyType, ParamsType, QueryType> & {
  ctx: {
    dbs: GenericDBS;
  };
};
