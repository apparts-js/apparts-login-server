import { useUserRoutes } from "./v1/user";
import { Application } from "express";
import { UserConstructorType } from "../model/user";
import { Mailer } from "types";

export const addRoutesForUpgrade = (
  app: Application,
  f: Parameters<typeof app.get>[1],
  apiVersion = 1,
) => {
  app.post("/v/" + apiVersion + "/user", f);
  app.get("/v/" + apiVersion + "/user/login", f);
  app.post("/v/" + apiVersion + "/user/logout", f);
  app.get("/v/" + apiVersion + "/user/apiToken", f);
  app.get("/v/" + apiVersion + "/user", f);
  app.delete("/v/" + apiVersion + "/user", f);
  app.put("/v/" + apiVersion + "/user", f);
  app.post("/v/" + apiVersion + "/user/:email/reset", f);
};

export const addRoutes = (
  app: Application,
  Users: UserConstructorType,
  mail: Mailer,
  apiVersion = 1,
) => {
  const {
    addUser,
    getUser,
    getToken,
    getAPIToken,
    deleteUser,
    updateUser,
    resetPassword,
    logout,
  } = useUserRoutes(Users, mail);

  app.post("/v/" + apiVersion + "/user", addUser);
  app.get("/v/" + apiVersion + "/user/login", getToken);
  app.put("/v/" + apiVersion + "/user/logout", logout);
  app.get("/v/" + apiVersion + "/user/apiToken", getAPIToken);
  app.get("/v/" + apiVersion + "/user", getUser);
  app.delete("/v/" + apiVersion + "/user", deleteUser);
  app.put("/v/" + apiVersion + "/user", updateUser);
  app.post("/v/" + apiVersion + "/user/:email/reset", resetPassword);
};
