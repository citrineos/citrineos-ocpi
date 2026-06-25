import { OcpiModule } from '@citrineos/ocpi-base';
import { AdminModuleApi } from './module/AdminModuleApi.js';
import { Service } from 'typedi';

export { AdminModuleApi } from './module/AdminModuleApi.js';

@Service()
export class AdminModule implements OcpiModule {
  getController(): any {
    return AdminModuleApi;
  }
}
