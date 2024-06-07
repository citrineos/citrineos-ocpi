import 'reflect-metadata';
import {CommandsModule} from "@citrineos/ocpi-commands";
import {VersionsModule} from "@citrineos/ocpi-versions";
import {OcpiServer, OcpiServerConfig} from "@citrineos/ocpi-base";
import {GlobalExceptionHandler} from "@citrineos/ocpi-base";
import {LoggingMiddleware} from "@citrineos/ocpi-base";

class CitrineOSServer {
    constructor(host: string, port: number) {
        const ocpiSerer = new OcpiServer(this.getConfig());

        ocpiSerer.run(host, port);

        console.log(`Server running on ${host}:${port}`);
    }

    protected getConfig() {
        const config = new OcpiServerConfig();

        config.routePrefix = '/ocpi/:versionId';
        config.middlewares = [GlobalExceptionHandler, LoggingMiddleware];
        config.defaultErrorHandler = false;
        config.modules = [
            new CommandsModule(),
            new VersionsModule()
        ]

        return config
    }
}

new CitrineOSServer("localhost", 8080);
