import { get as getConfig } from "@apparts/config";
import { BaseModel } from "@apparts/model";
import { HttpError } from "@apparts/prep";
import * as types from "@apparts/types";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import JWT from "jsonwebtoken";
import { v7 as uuid } from "uuid";

const UserSettings = getConfig("login-config");

const {
  apiToken: { webtokenkey, expireTime },
  welcomeMail,
  resetMail,
  resetUrl,
} = UserSettings;

export const userSchema = types.obj({
  id: types
    .string()
    // .semantic("id")
    .public()
    .default(() => uuid())
    .key(),
  email: types.email().public(),
  token: types.base64().optional(),
  tokenforreset: types.base64().optional(),
  hash: types.any().optional(),
  deleted: types.boolean().default(false),
  createdon: types
    .int()
    .semantic("time")
    .default(() => Date.now())
    .public(),
});

export type UserType = types.InferType<typeof userSchema>;

export class BaseUsers<
  Schema extends typeof userSchema,
> extends BaseModel<Schema> {
  resetTokenUsed = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async setExtra(extra) {}

  getWelcomeMail() {
    return {
      title: welcomeMail.title,
      body: welcomeMail.body.replace(
        /##URL##/g,
        resetUrl +
          `?token=${encodeURIComponent(
            this.content.tokenforreset!,
          )}&email=${encodeURIComponent(this.content.email)}&welcome=true`,
      ),
    };
  }

  getResetPWMail() {
    return {
      title: resetMail.title,
      body: resetMail.body.replace(
        /##URL##/g,
        resetUrl +
          `?token=${encodeURIComponent(
            this.content.tokenforreset!,
          )}&email=${encodeURIComponent(this.content.email)}`,
      ),
    };
  }

  async _checkToken(token: string) {
    if (
      !token ||
      (token !== this.content.token && token !== this.content.tokenforreset)
    ) {
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
    const hash = await bcrypt.hash(password, UserSettings.pwHashRounds);
    this.content.hash = hash;
    return this;
  }

  genToken() {
    return new Promise((res) => {
      crypto.randomBytes(UserSettings.tokenLength, (err, token) => {
        /* istanbul ignore if */
        if (err) {
          throw "[User] Could not generate Token, E33" + err;
        } else {
          this.content.token = token.toString("base64");
          res(this);
        }
      });
    });
  }

  async store() {
    await this.genToken();
    return await super.store();
  }

  async genResetToken() {
    const oldToken = this.content.token;
    await this.genToken();
    this.content.tokenforreset = this.content.token;
    this.content.token = oldToken;
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
    return JWT.sign(payload, webtokenkey, {
      expiresIn: expireTime,
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

// export const createUserModel = <T extends Keys>(
//   inputSchema: T,
//   collectionName = "users",
// ) => {
//   const schema = types.obj({
//     ...userSchema.getKeys(),
//     ...inputSchema,
//   });

//   const UsersBase = useModel({
//     typeSchema: schema,
//     collection: collectionName,
//   });

//   return Users;
// };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UserConstructorType = new (...ps: any[]) => BaseUsers<any>;
