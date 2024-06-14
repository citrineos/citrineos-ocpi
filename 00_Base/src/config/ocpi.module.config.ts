import { Service } from 'typedi';
import { Constructable } from "typedi/types/types/constructable.type";
import { IOcpiModule } from "../model/IOcpiModule";

@Service()
export class OcpiModuleConfig {
  moduleTypes: Constructable<IOcpiModule>[];

  constructor(moduleTypes?: Constructable<IOcpiModule>[]) {
    this.moduleTypes = moduleTypes ?? [];
  }
}
