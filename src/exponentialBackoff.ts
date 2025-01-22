import { HttpError } from "@apparts/prep";
import { GenericDBS } from "@apparts/db";
import { UseLoginsType } from "model/logins";

export const checkAuthPwExponential = async (
  dbs: GenericDBS,
  Logins: UseLoginsType,
  userId: string,
  password: string,
  checkAuthPw: (pw: string) => Promise<void>,
) => {
  const thisLogin = await new Logins(dbs, [
    {
      userId,
    },
  ]).store();

  const lastLoginsDb = await new Logins(dbs).load({ userId }, 10, 0, [
    { key: "created", dir: "DESC" },
  ]);
  const lastLogins = lastLoginsDb.contents.filter(
    ({ id }) => id !== thisLogin.content.id,
  );
  const latestSuccessfulLoginIdx = lastLogins.findIndex(
    ({ success }) => success === true,
  );
  const lastFailedLogins = lastLogins.slice(
    0,
    latestSuccessfulLoginIdx === -1 ? undefined : latestSuccessfulLoginIdx,
  );

  const failedLogInAttempts = lastFailedLogins.length,
    lastLogInAttempt = (lastLogins[0] && lastLogins[0].created) || Date.now();

  if (failedLogInAttempts >= 5) {
    const nextAllowedTry =
      lastLogInAttempt + Math.pow(2, failedLogInAttempts - 5) * 1000 * 60;
    if (Date.now() <= nextAllowedTry) {
      throw new HttpError(
        425,
        "Login failed, too often.",
        "Next allowed login attempt at: " + new Date(nextAllowedTry),
      );
    }
  }

  try {
    await checkAuthPw(password);
    thisLogin.content.success = true;
    await thisLogin.update();
  } catch (e) {
    thisLogin.content.success = false;
    await thisLogin.update();
    throw e;
  }
};
