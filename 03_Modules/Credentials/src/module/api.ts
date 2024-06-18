import { Controller } from 'routing-controllers';
import { BaseController, ModuleId } from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { ICredentialsModuleApi } from './interface';

@Controller(`/${ModuleId.Credentials}`)
@Service()
export class CredentialsModuleApi
  extends BaseController
  implements ICredentialsModuleApi {
  // todo
}
