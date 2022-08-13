const addRoutes = require("./routes");
const routes = require("./routes/v1/user");
const createUseUser = require("./model/user");
const createUseLogins = require("./model/logins");
const errors = require("./errors");
const exponentialBackoff = require("./exponentialBackoff");

module.exports = {
  addRoutes,
  routes,
  createUseUser,
  createUseLogins,
  ...exponentialBackoff,
  ...errors,
};
