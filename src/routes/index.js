const useUserRoutes = require("./v1/user");

const addRoutesForUpgrade = (app, f, apiVersion = 1) => {
  app.post("/v/" + apiVersion + "/user", f);
  app.get("/v/" + apiVersion + "/user/login", f);
  app.get("/v/" + apiVersion + "/user/apiToken", f);
  app.get("/v/" + apiVersion + "/user", f);
  app.delete("/v/" + apiVersion + "/user", f);
  app.put("/v/" + apiVersion + "/user", f);
  app.post("/v/" + apiVersion + "/user/:email/reset", f);
};

const addRoutes = (app, useUser, mail, apiVersion = 1) => {
  const {
    addUser,
    getUser,
    getToken,
    getAPIToken,
    deleteUser,
    updateUser,
    resetPassword,
  } = useUserRoutes(useUser, mail);

  app.post("/v/" + apiVersion + "/user", addUser);
  app.get("/v/" + apiVersion + "/user/login", getToken);
  app.get("/v/" + apiVersion + "/user/apiToken", getAPIToken);
  app.get("/v/" + apiVersion + "/user", getUser);
  app.delete("/v/" + apiVersion + "/user", deleteUser);
  app.put("/v/" + apiVersion + "/user", updateUser);
  app.post("/v/" + apiVersion + "/user/:email/reset", resetPassword);
};

module.exports = addRoutes;
module.exports.upgrade = addRoutesForUpgrade;
