import Koa from 'koa';
import {useKoaServer} from "routing-controllers";
import {OcpiModuleConfig} from "./OcpiModuleConfig";

export class BaseOcpiModule {
    constructor(koa: Koa, config: OcpiModuleConfig, controllers?: Function[] | string[]) {
        useKoaServer(koa, { controllers, ...config })
    }
}
