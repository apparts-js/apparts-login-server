"use strict";

const { useModel, makeModel } = require("@apparts/model");

module.exports = (types, collectionName = "logins") => {
  const [Logins, Login, NoLogin] = useModel(
    {
      id: { type: "id", public: true, auto: true, key: true },
      created: { type: "time", default: () => Date.now(), public: true },
      userId: { type: "id", public: true },
      success: { type: "boolean", public: true, optional: true },
      ...types,
    },
    collectionName
  );

  return makeModel("Login", [Logins, Login, NoLogin]);
};
