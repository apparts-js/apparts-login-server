import * as types from "@apparts/types";

export const makeFakeSchema = (type) =>
  ({
    getType() {
      return type;
    },
    getModelType() {
      return type;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as types.Obj<any, any>;
