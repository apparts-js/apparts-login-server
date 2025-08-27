
CREATE TABLE "user" (
       id UUID PRIMARY KEY,
       email VARCHAR(128) UNIQUE NOT NULL,
       token VARCHAR(64),
       "tokenForReset" VARCHAR(64),
       "tokenForResetExpiry" BIGINT,
       hash CHAR(60),
       deleted BOOL NOT NULL,
       created BIGINT NOT NULL
);


CREATE TABLE login (
       id UUID PRIMARY KEY,
       created BIGINT NOT NULL,
       "userId" UUID NOT NULL,
       success BOOLEAN
);
