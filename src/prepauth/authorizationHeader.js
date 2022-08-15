const basicAuth = (req) => {
  let m = /^Basic (.*)$/.exec(req.get("Authorization") || "");
  if (m) {
    m = /([^:]*):(.*)/.exec(new Buffer(m[1], "base64").toString("ascii"));
    if (m) {
      const email = m[1],
        token = m[2];
      return [email, token];
    }
  }
  return [];
};

module.exports = { basicAuth };
