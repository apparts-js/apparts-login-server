
CREATE TABLE users (
       id UUID PRIMARY KEY,
       email VARCHAR(128) UNIQUE NOT NULL,
       token VARCHAR(64),
       tokenForReset VARCHAR(64),
       hash CHAR(60),
       deleted BOOL NOT NULL,
       createdOn BIGINT NOT NULL
);


CREATE TABLE logins (
       id UUID PRIMARY KEY,
       created BIGINT NOT NULL,
       "userId" UUID NOT NULL,
       success BOOLEAN
);
