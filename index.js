const addRoutes = require("./routes");
const routes = require("./routes/v1/user");
const createUseUser = require("./model/user");
const errors = require("./errors");

module.exports = { addRoutes, routes, createUseUser, ...errors };
