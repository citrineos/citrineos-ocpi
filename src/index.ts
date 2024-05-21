import 'reflect-metadata';
import {Container} from "typedi";
import {useContainer} from "routing-controllers";
import {OcpiServer} from "./ocpiServer";

export {OcpiModule} from './modules/temp/module';

useContainer(Container);
let server = Container.get(OcpiServer);
console.log('initialized server', server);
