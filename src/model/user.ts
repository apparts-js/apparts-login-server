import { BaseModel } from "@apparts/model";
import { HttpError } from "@apparts/prep";
import * as types from "@apparts/types";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import JWT from "jsonwebtoken";
import ms from "ms";
import { v7 as uuid } from "uuid";
import { SessionConstructorType } from "./sessions";
import { checkAuthPwExponential } from "../exponentialBackoff";
import { LoginConstructorType } from "./logins";

export const userSchema = types.obj({
  id: types
    .string()
    .semantic("id")
    .public()
    .default(() => uuid())
    .key(),
  email: types.email().public(),
  tokenForReset: types.base64().optional(),
  tokenForResetExpiry: types.int().semantic("date").optional(),
  hash: types.any().optional(),
  deleted: types.boolean().default(false),
  created: types
    .int()
    .semantic("time")
    .default(() => Date.now())
    .public(),
});

export type UserType = types.InferType<typeof userSchema>;

export abstract class BaseUsers<
  Schema extends typeof userSchema,
> extends BaseModel<Schema> {
  resetTokenUsed = false;

  async setExtra(_extra: unknown) {}

  abstract getWelcomeMail(): { title: string; body: string };
  abstract getResetPWMail(): { title: string; body: string };
  abstract getEncryptionSettings(): {
    passwordSaltLength: number;
    cookieTokenLength: number;
    webtokenkey: string;
    webtokenExpireTime: number | ms.StringValue;
    resettokenLength: number;
    resettokenExpireTime: number | ms.StringValue;
  };
  abstract getSessions(): SessionConstructorType;
  abstract getLogins(): LoginConstructorType;

  async loadBySessionToken(email: string, token: string) {
    const session = new (this.getSessions())(this._dbs);
    await session.loadOne({ token, valid: true });
    await (this as BaseUsers<typeof userSchema>).loadOne({
      email,
      deleted: false,
      id: session.content.userId,
    });
    return this;
  }

  async loadSessions() {
    const sessions = new (this.getSessions())(this._dbs);
    await sessions.load({ userId: this.content.id, valid: true });
    return sessions.contents;
  }

  async _checkToken(token: string) {
    const sessions = new (this.getSessions())(this._dbs);
    await sessions.load({
      userId: this.content.id,
      token,
      valid: true,
    });

    const isValidToken = token && sessions.length() > 0;
    const isValidResetToken =
      token &&
      token === this.content.tokenForReset &&
      (this.content.tokenForResetExpiry || 0) > Date.now();
    if (!isValidToken && !isValidResetToken) {
      throw new HttpError(401, "Unauthorized");
    }
    if (this.content.tokenForReset) {
      this.content.tokenForReset = undefined;
      this.resetTokenUsed = true;
      await this.update();
    }
    return this;
  }

  async checkAuth(token: string) {
    return await this._checkToken(token);
  }

  async _checkPw(password: string) {
    if (!this.content.hash) {
      throw new HttpError(401, "Please reset your password.");
    }
    const matches = await bcrypt.compare(password, this.content.hash);
    if (matches) {
      return this;
    } else {
      throw new HttpError(401, "Unauthorized");
    }
  }

  async checkAuthPw(password: string) {
    await checkAuthPwExponential(
      this._dbs,
      this.getLogins(),
      this.content.id,
      password,
      async (password) => {
        await this._checkPw(password);
      },
    );
    return this;
  }

  async setPw(password: string) {
    const hash = await bcrypt.hash(
      password,
      this.getEncryptionSettings().passwordSaltLength,
    );
    this.content.hash = hash;
    return this;
  }

  async createSession(details: { ip?: string; browser?: string; os?: string }) {
    const session = new (this.getSessions())(this._dbs, [
      {
        userId: this.content.id,
        token: await this.genSecureStr(
          this.getEncryptionSettings().cookieTokenLength,
        ),
        details,
        valid: true,
      },
    ]);
    await session.store();
    return session.content.token;
  }

  private async genSecureStr(length: number) {
    return new Promise<string>((res) => {
      crypto.randomBytes(length, (err, token) => {
        if (err) {
          throw "[User] Could not generate Token, E33" + err;
        } else {
          res(token.toString("base64"));
        }
      });
    });
  }

  async genResetToken() {
    const { resettokenLength, resettokenExpireTime } =
      this.getEncryptionSettings();
    this.content.tokenForReset = await this.genSecureStr(resettokenLength);
    this.content.tokenForResetExpiry =
      Date.now() +
      (typeof resettokenExpireTime === "number"
        ? resettokenExpireTime
        : ms(resettokenExpireTime));
  }

  async getExtraAPITokenContent() {
    return {};
  }

  async getAPIToken(extraDynamicContent = {}, extraJWTOptions = {}) {
    if (!this._checkTypes([this.content])) {
      throw new Error("User: getAPIToken called on a non-valid user");
    }
    const extra = await this.getExtraAPITokenContent();
    const payload = {
      id: this.content.id,
      action: "login",
      email: this.content.email,
      ...extra,
      ...extraDynamicContent,
    };
    return JWT.sign(payload, this.getEncryptionSettings().webtokenkey, {
      expiresIn: this.getEncryptionSettings().webtokenExpireTime,
      ...extraJWTOptions,
    });
  }

  private async invalidateSessions(filter: { token?: string } = {}) {
    const sessions = new (this.getSessions())(this._dbs);
    await sessions.load({ userId: this.content.id, valid: true, ...filter });
    for (const session of sessions.contents) {
      session.valid = false;
    }
    await sessions.update();
  }

  async invalidateSession(token: string) {
    await this.invalidateSessions({ token });
  }

  async invalidateAllSessions() {
    await this.invalidateSessions();
  }

  async deleteMe() {
    const sessions = new (this.getSessions())(this._dbs);
    await sessions.delete({ userId: this.content.id });

    this.content.tokenForReset = undefined;
    this.content.deleted = true;
    await this.update();
  }
}

export type UserConstructorType = new (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...ps: any[]
) => BaseUsers<typeof userSchema>;
