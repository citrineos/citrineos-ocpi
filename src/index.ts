import 'reflect-metadata';
import {Container} from 'typedi';
import {useContainer} from 'routing-controllers';
import {OcpiServer} from './ocpi.server';

export {OcpiModule} from './module';

useContainer(Container);
const server = Container.get(OcpiServer);
console.log('initialized server', server);
