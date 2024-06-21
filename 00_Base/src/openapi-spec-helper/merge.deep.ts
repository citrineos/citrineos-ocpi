import _merge from "lodash.merge";

export const mergeDeep = (target: any, ...sources: any[]): any =>
  _merge(target, ...sources);
