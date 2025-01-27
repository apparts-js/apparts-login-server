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
