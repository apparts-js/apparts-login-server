import { HttpError } from "@apparts/prep";
import { Request } from "express";
import { UserConstructorType } from "model/user";
import { basicAuth } from "./../../../prepauth/authorizationHeader";
import { decodeCookie } from "./cookie";

export const getUserFromResetToken = async (
  req: Request,
  User: UserConstructorType,
) => {
  // @ts-expect-error 2339
  const dbs = req.ctx.dbs;
  const user = new User(dbs);
  try {
    const [email, token] = basicAuth(req);
    if (!email || !token) {
      throw new HttpError(401, "Unauthorized");
    }
    await user.loadOne({ email });
    await user.checkAuth(token);
    return {
      user,
      email,
    };
  } catch {
    throw new HttpError(401, "Unauthorized");
  }
};

export const getUserFromCookie = async (
  req: Request,
  User: UserConstructorType,
) => {
  const cookieContent = decodeCookie(req.headers.cookie ?? "");
  if (!cookieContent) {
    throw new HttpError(401, "Unauthorized");
  }

  // @ts-expect-error 2339
  const dbs = req.ctx.dbs;
  const user = new User(dbs);
  try {
    const [email, token] = cookieContent;
    await user.loadOne({ email });
    await user.checkAuth(token);
    return { user, email, token };
  } catch {
    throw new HttpError(401, "Unauthorized");
  }
};

export const getUserFromAny = async (
  req: Request,
  User: UserConstructorType,
) => {
  try {
    const { user } = await getUserFromResetToken(req, User);
    return { user, isReset: true };
  } catch {
    const { user, token } = await getUserFromCookie(req, User);
    return { user, token, isReset: false };
  }
};
