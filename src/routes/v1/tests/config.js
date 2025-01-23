const fs = require("fs");

export default {
  schemas: ["schema000"].map((schema) =>
    fs.readFileSync("./sql/" + schema + ".sql").toString(),
  ),
  apiVersion: 1,
};
