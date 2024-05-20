import 'reflect-metadata';
import {container} from 'tsyringe';
import {OcpiServer} from "./ocpiServer";

export {CredentialsModuleApi} from './modules/temp/credentials.api';
export {OcpiModule} from './modules/temp/module';
export {EverythingElseApi} from './modules/temp/everything.else.api';
export {VersionsModuleApi} from './modules/temp/versions.api';

const instance = container.resolve(OcpiServer);
