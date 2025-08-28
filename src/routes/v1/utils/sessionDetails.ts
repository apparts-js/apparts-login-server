import { Request } from "express";
import uap from "ua-parser-js";

export const sessionDetailsFromRequest = (req: Request) => {
  const ua = req.headers["user-agent"] ?? "";
  const userAgentData = uap.UAParser(ua);
  const ip = req.ip;
  return {
    ip,
    browser: userAgentData.browser.name,
    os: userAgentData.os.name,
  };
};
