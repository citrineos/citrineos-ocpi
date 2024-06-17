import { Service } from 'typedi';
import { Constructable } from 'typedi/types/types/constructable.type';
import { OcpiModule } from '../model/OcpiModule';

@Service()
export class OcpiModuleConfig {
  moduleTypes: Constructable<OcpiModule>[];

  constructor(moduleTypes?: Constructable<OcpiModule>[]) {
    this.moduleTypes = moduleTypes ?? [];
  }
}
