import 'reflect-metadata';
import { Container } from 'typedi';
import { useContainer } from 'routing-controllers';
import { OcpiServer } from './ocpi.server';
import {DefaultOcppClient} from "./DefaultOcppClient";
import {IOcppClient} from "./IOcppClient";

export function startOcpiServer(ocppClient: IOcppClient) {
    if (!ocppClient) {
        ocppClient = new DefaultOcppClient();
    }

    useContainer(Container);

    Container.set(IOcppClient, ocppClient)

    const server = Container.get(OcpiServer);

    console.log('Initialized OCPI server', server);
}

startOcpiServer(new DefaultOcppClient())

export { DefaultOcppClient };
export { IOcppClient };
