import {JsonController} from 'routing-controllers';
import {BaseController, ModuleId} from '@citrineos/ocpi-base';
import {Service} from 'typedi';
import {IVersionsModuleApi} from "./interface";

@JsonController(`/${ModuleId.Versions}`)
@Service()
export class VersionsModuleApi extends BaseController implements IVersionsModuleApi {
}
