import { Constructable } from "typedi";

export interface IOcpiModule {
  getController: () => any;
}
