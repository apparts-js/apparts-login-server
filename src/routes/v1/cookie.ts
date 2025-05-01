import { Response } from "express";
import ms, { StringValue } from "ms";

export const decodeCookie = (cookieStr: string) => {
  const loginCookie = cookieStr
    .split("; ")
    .filter((c) => c.startsWith("loginToken="))[0];

  if (!loginCookie) {
    return false;
  }

  try {
    const token = decodeURIComponent(loginCookie.split("=")[1] ?? "");
    const [email, loginToken] = atob(token).split(":");
    return [email, loginToken];
  } catch (_) {
    return false;
  }
};

export const encodeTokenForCookie = (user: { email: string; token: string }) =>
  btoa(user.email + ":" + user.token);

export const setCookie = (
  res: Response,
  content: string,
  settings: {
    allowUnsecure: boolean;
    expireTime: number | StringValue;
  },
) => {
  res.cookie("loginToken", content, {
    httpOnly: true,
    secure: !settings.allowUnsecure,
    sameSite: "strict",
    maxAge: ms(String(settings.expireTime) as StringValue),
  });
};
