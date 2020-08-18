
CREATE TABLE users (
       id SERIAL PRIMARY KEY,
       email VARCHAR(128) UNIQUE NOT NULL,
       token VARCHAR(64),
       tokenForReset VARCHAR(64),
       hash CHAR(60),
       deleted BOOL NOT NULL,
       createdOn BIGINT NOT NULL
);

