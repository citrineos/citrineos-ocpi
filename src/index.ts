import 'reflect-metadata';
import {container} from 'tsyringe';
import {OcpiServer} from "./ocpiServer";

export {OcpiModule} from './modules/temp/module';

const instance = container.resolve(OcpiServer);
