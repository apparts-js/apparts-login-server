const { Client } = require("pg");
const connect = require("@apparts/db");

const _dbConfig = require("@apparts/config").get("db-test-config");
const dbConfig = {
  ..._dbConfig,
  postgresql: {
    ..._dbConfig.postgresql,
    password: _dbConfig.postgresql.pw,
  },
};

let dbs = null;

const setup = async (schemas, setupSql, dbName) => {
  try {
    await createOrDropDatabase("DROP", dbConfig.postgresql, dbName);
  } catch (e) {
    console.log("DROP DID NOT WORK", e);
    // Can happen, not a problem
  }
  await createOrDropDatabase("CREATE", dbConfig.postgresql, dbName);
  const tempDBConfig = {
    ...dbConfig.postgresql,
    db: dbName,
    database: dbName,
  };
  const pool = new Client(tempDBConfig);
  await pool.connect();
  for (const schema of schemas) {
    await pool.query(schema);
  }
  if (setupSql) {
    await pool.query(setupSql);
  }
  await pool.end();
  if (dbs) {
    await new Promise((res) => dbs.shutdown(() => res()));
  }
  dbs = await new Promise((res) => {
    connect({ use: "postgresql", postgresql: tempDBConfig }, (e, dbs) => {
      if (e) {
        /* istanbul ignore next */
        console.log("DB ERROR");
        throw e;
      }
      console.log("Connected to DB for tests");
      res(dbs);
    });
  });
  return dbs;
};

const getPool = () => {
  return dbs;
};

const teardown = async () => {
  if (dbs) {
    await new Promise((res) => dbs.shutdown(() => res()));
    dbs = null;
  }
};

const singleEntry = async (dbName, sql) => {
  const tempDBConfig = { ...dbConfig.postgresql, database: dbName };
  const pool = new Client(tempDBConfig);
  await pool.connect();
  const response = await pool.query(sql);
  await pool.end();
  return response;
};

const createOrDropDatabase = async (action, opts, dbName) => {
  const config = opts;
  config.database = "postgres";

  const client = new Client(config);
  //disconnect client when all queries are finished
  //  client.on('drain', client.end.bind(client));
  client.on("error", (err) => {
    client.end.bind(client);
    throw "COULD NOT " + action + " DATABASE " + dbName + ": " + err;
  });
  await client.connect();

  const escapedDbName = dbName.replace(/"/g, '""');
  const sql = action + ' DATABASE "' + escapedDbName + '"';
  await client.query(sql);
  await client.end();
};

module.exports = { setup, teardown, singleEntry, getPool };
