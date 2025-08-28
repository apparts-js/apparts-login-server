import { UseUserRoutesProps } from "../../types";

import { addUser } from "./addUser";
import { deleteUser } from "./deleteUser";
import { getAPIToken } from "./getAPIToken";
import { getToken } from "./getToken";
import { getUser } from "./getUser";
import { logout } from "./logout";
import { resetPassword } from "./resetPassword";
import { updateUser } from "./updateUser";

export const useUserRoutes = (props: UseUserRoutesProps) => {
  return {
    addUser: addUser(props),
    getUser: getUser(props),
    getToken: getToken(props),
    getAPIToken: getAPIToken(props),
    deleteUser: deleteUser(props),
    updateUser: updateUser(props),
    resetPassword: resetPassword(props),
    logout: logout(props),
  };
};
