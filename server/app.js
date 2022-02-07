"use static";

const app = require("apparts-node-app");
const { prepauth } = require("apparts-types");
const User = require("./model/user.js");

prepauth.setUserModel(User);

app.app("debug", (app, dbs) => {
  app.use(
    "/v1/user/",
    require("./routes/user")(dbs, {
      sendMailToAddresses: () => Promise.resolve(),
    })
  );
});
