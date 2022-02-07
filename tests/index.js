const connect = require("@apparts/db");
const {
  checkApiTypes: { checkType: _checkType, allChecked: _allChecked },
} = require("@apparts/types");

const { setup, teardown, getPool } = require("./database");

const error = (text) => ({ error: text });

module.exports = (apithing, { api, schemas }, dbs, name) => {
  const checkType = (res, name) => _checkType(apithing, res, name);
  const allChecked = (res, name) => _allChecked(apithing, res, name);

  const databaseName = api + "_" + name;
  const DB_CONFIG = require("@apparts/config").get("db-test-config");
  const myDbConfig = {
    ...DB_CONFIG,
    postgresql: {
      ...DB_CONFIG.postgresql,
      db: databaseName,
    },
  };
  const app = require("../test-app.js")(myDbConfig);
  const url = (postfix, query) => {
    let queryparams = "";
    if (query) {
      queryparams =
        "?" +
        Object.keys(query)
          .map((key) => `${key}=${query[key]}`)
          .join("&");
    }
    return `/v/${api}/${postfix}${queryparams}`;
  };

  const runDBQuery = async (queryRunner) => {
    const dbs = await new Promise((res, rej) => {
      connect(myDbConfig, (e, dbs) => {
        if (e) {
          rej(e);
        }
        res(dbs);
      });
    });
    const result = await queryRunner(dbs);
    await new Promise((res) => {
      dbs.shutdown(() => {
        res();
      });
    });
    return result;
  };
  if (!Array.isArray(dbs)) {
    dbs = [dbs];
  }
  const pSetupquery = async () => {
    let query = "";
    for (const db of dbs) {
      query += await db();
    }
    return query;
  };

  beforeAll(async () => {
    const setupquery = await pSetupquery();
    await setup(schemas, setupquery, databaseName);
  });
  afterAll(async () => {
    await teardown(databaseName);
    await require("../test-app.js").shutdown();
  });

  return { checkType, allChecked, app, url, error, runDBQuery, getPool };
};

module.exports.error = error;
