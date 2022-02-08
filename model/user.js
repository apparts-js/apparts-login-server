"use strict";

const { HttpError } = require("@apparts/error");
const { useModel, makeModel } = require("@apparts/model");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const UserSettings = require("@apparts/config").get("login-config");
const JWT = require("jsonwebtoken");
const {
  apiToken: { webtokenkey, expireTime },
  welcomeMail,
  resetMail,
  resetUrl,
} = UserSettings;
module.exports = (types, collectionName = "users") => {
  const [Users, _User, NoUser] = useModel(
    {
      id: { type: "id", public: true, auto: true, key: true },
      email: { type: "email", unique: true, public: true },
      token: { type: "base64", optional: true },
      tokenforreset: { type: "base64", optional: true },
      hash: { type: "/", optional: true },
      deleted: { type: "bool", default: false },
      createdon: { type: "time", default: () => Date.now(), public: true },
      ...types,
    },
    collectionName
  );

  class User extends _User {
    constructor(dbs, content) {
      super(dbs, content);
    }

    async setExtra() {}

    getWelcomeMail() {
      return {
        title: welcomeMail.title,
        body: welcomeMail.body.replace(
          /##URL##/g,
          resetUrl +
            `?token=${encodeURIComponent(
              this.content.tokenforreset
            )}&email=${encodeURIComponent(this.content.email)}&welcome=true`
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
              this.content.tokenforreset
            )}&email=${encodeURIComponent(this.content.email)}`
        ),
      };
    }

    async _checkToken(token) {
      if (
        !token ||
        (token !== this.content.token && token !== this.content.tokenforreset)
      ) {
        throw new HttpError(401);
      }
      if (this.content.tokenforreset) {
        this.content.tokenforreset = null;
        this.resetTokenUsed = true;
        await this.update();
      }
      return this;
    }

    async checkAuth(token) {
      return await this._checkToken(token);
    }

    async _checkPw(password) {
      if (!this.content.hash) {
        throw new HttpError(401, "Please reset your password.");
      }
      const matches = await bcrypt.compare(password, this.content.hash);
      if (matches) {
        return this;
      } else {
        throw new HttpError(401);
      }
    }

    checkAuthPw(password) {
      return this._checkPw(password);
    }

    async setPw(password) {
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

    async getExtraAPITokenContent() {}

    async getAPIToken(extraDynamicContent = {}) {
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
      return await JWT.sign(payload, webtokenkey, { expiresIn: expireTime });
    }

    async deleteMe() {
      this.content.token = null;
      this.content.tokenforreset = null;
      this.content.deleted = true;
      this.update();
    }
  }

  return makeModel("User", [Users, User, NoUser]);
};
