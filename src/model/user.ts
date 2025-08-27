import { BaseModel } from "@apparts/model";
import { HttpError } from "@apparts/prep";
import * as types from "@apparts/types";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import JWT from "jsonwebtoken";
import ms from "ms";
import { v7 as uuid } from "uuid";

export const userSchema = types.obj({
  id: types
    .string()
    .semantic("id")
    .public()
    .default(() => uuid())
    .key(),
  email: types.email().public(),
  token: types.base64().optional(),
  tokenforreset: types.base64().optional(),
  tokenforresetexpiry: types.int().semantic("date").optional(),
  hash: types.any().optional(),
  deleted: types.boolean().default(false),
  createdon: types
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
    passwordHashRounds: number;
    cookieTokenLength: number;
    webtokenkey: string;
    webtokenExpireTime: number | ms.StringValue;
    resettokenLength: number;
    resettokenExpireTime: number | ms.StringValue;
  };

  async _checkToken(token: string) {
    const isValidToken = token && token === this.content.token;
    const isValidResetToken =
      token &&
      token === this.content.tokenforreset &&
      (this.content.tokenforresetexpiry || 0) > Date.now();
    if (!isValidToken && !isValidResetToken) {
      throw new HttpError(401, "Unauthorized");
    }
    if (this.content.tokenforreset) {
      this.content.tokenforreset = undefined;
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
    return this._checkPw(password);
  }

  async setPw(password: string) {
    const hash = await bcrypt.hash(
      password,
      this.getEncryptionSettings().passwordHashRounds,
    );
    this.content.hash = hash;
    return this;
  }

  async genToken() {
    const token = await this.genSecureStr(
      this.getEncryptionSettings().cookieTokenLength,
    );
    this.content.token = token;
    return this;
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

  async store() {
    await this.genToken();
    return await super.store();
  }

  async genResetToken() {
    const { resettokenLength, resettokenExpireTime } =
      this.getEncryptionSettings();
    this.content.tokenforreset = await this.genSecureStr(resettokenLength);
    this.content.tokenforresetexpiry =
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

  async deleteMe() {
    this.content.token = undefined;
    this.content.tokenforreset = undefined;
    this.content.deleted = true;
    await this.update();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UserConstructorType = new (...ps: any[]) => BaseUsers<any>;
