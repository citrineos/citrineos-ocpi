import 'reflect-metadata';
import {Container} from 'typedi';
import {useContainer} from 'routing-controllers';
import {EmspServer} from "./emsp.server";

useContainer(Container);
const server = Container.get(EmspServer);
console.log('initialized mock emsp server', server);
