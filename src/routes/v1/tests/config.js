const fs = require("fs");

module.exports = {
  schemas: ["schema000"].map((schema) =>
    fs.readFileSync("./sql/" + schema + ".sql").toString(),
  ),
  apiVersion: 1,
};
