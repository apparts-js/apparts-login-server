import { NotFound } from "@apparts/model";
import {
  AuthResponse,
  BodyObj,
  HttpError,
  httpErrorSchema,
  OneOfReturnTypes,
  OptionsType,
  ParamsObj,
  prepare,
  QueryObj,
  ResponseType,
  ReturnsArray,
} from "@apparts/prep";
import { basicAuth } from "./authorizationHeader";

import { ActualRequestType } from "../types";
import { UserConstructorType } from "model/user";

type FunType<
  BodyType extends BodyObj,
  ParamsType extends ParamsObj,
  QueryType extends QueryObj,
  ReturnTypes extends ReturnsArray,
> = (
  req: ActualRequestType<BodyType, ParamsType, QueryType>,
  user: InstanceType<UserConstructorType>,
  res: ResponseType,
) => Promise<OneOfReturnTypes<ReturnTypes>>;

const _prepauth = <
  BodyType extends BodyObj,
  ParamsType extends ParamsObj,
  QueryType extends QueryObj,
  ReturnTypes extends ReturnsArray,
  AuthType extends AuthResponse,
>(
  options: OptionsType<BodyType, ParamsType, QueryType, ReturnTypes, AuthType>,
  fun: FunType<BodyType, ParamsType, QueryType, ReturnTypes>,
  usePw: boolean,
  User: UserConstructorType,
) => {
  return prepare(options, async (req, res) => {
    const { ctx } = req as ActualRequestType<BodyType, ParamsType, QueryType>;
    const [email, token] = basicAuth(req);
    if (!email || !token) {
      return new HttpError(
        400,
        "Authorization wrong",
      ) as OneOfReturnTypes<ReturnTypes>;
    }
    const user = new User(ctx.dbs);
    try {
      await user.loadOne({ email: email.toLowerCase(), deleted: false });
      if (usePw) {
        await user.checkAuthPw(token);
      } else {
        await user.checkAuth(token);
      }
    } catch (e) {
      if (e instanceof NotFound) {
        return new HttpError(
          401,
          "User not found",
        ) as OneOfReturnTypes<ReturnTypes>;
      }
      throw e;
    }
    return fun(
      req as ActualRequestType<BodyType, ParamsType, QueryType>,
      user,
      res,
    );
  });
};
_prepauth.returns = [
  httpErrorSchema(401, "User not found"),
  httpErrorSchema(400, "Authorization wrong"),
];

export const prepauthToken =
  (User: UserConstructorType) =>
  <
    BodyType extends BodyObj,
    ParamsType extends ParamsObj,
    QueryType extends QueryObj,
    ReturnTypes extends ReturnsArray,
    AuthType extends AuthResponse,
  >(
    options: OptionsType<
      BodyType,
      ParamsType,
      QueryType,
      ReturnTypes,
      AuthType
    >,
    fun: FunType<BodyType, ParamsType, QueryType, ReturnTypes>,
  ) => {
    return _prepauth(
      {
        ...options,
        auth: "Basic btoa(uname:token)",
        returns: [
          ...(options.returns || []),
          ...prepauthToken.returns,
        ] as ReturnTypes,
      },
      fun,
      false,
      User,
    );
  };
prepauthToken.returns = _prepauth.returns;

export const prepauthPW =
  (User: UserConstructorType) =>
  <
    BodyType extends BodyObj,
    ParamsType extends ParamsObj,
    QueryType extends QueryObj,
    ReturnTypes extends ReturnsArray,
    AuthType extends AuthResponse,
  >(
    options: OptionsType<
      BodyType,
      ParamsType,
      QueryType,
      ReturnTypes,
      AuthType
    >,
    fun: FunType<BodyType, ParamsType, QueryType, ReturnTypes>,
  ) => {
    return _prepauth(
      {
        ...options,
        auth: "Basic btoa(uname:password)",
        returns: [
          ...(options.returns || []),
          ...prepauthPW.returns,
        ] as ReturnTypes,
      },
      fun,
      true,
      User,
    );
  };
prepauthPW.returns = _prepauth.returns;
