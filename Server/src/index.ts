import "reflect-metadata";
import { OcpiServer } from "@citrineos/ocpi-base";
import { Container } from "typedi";
import { OcpiModuleConfig } from "@citrineos/ocpi-base/dist/config/ocpi.module.config";
import { CredentialsModule } from "../../dist/03_Modules/Credentials/src";
import { VersionsModule } from "@citrineos/ocpi-versions";

class CitrineOSServer {
  constructor() {
    Container.set(
      OcpiModuleConfig,
      new OcpiModuleConfig([VersionsModule, CredentialsModule]),
    );

    const ocpiServer = Container.get(OcpiServer);
    ocpiServer.run();
  }
}

new CitrineOSServer();
