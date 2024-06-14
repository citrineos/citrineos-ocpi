import 'reflect-metadata';
import { OcpiModuleConfig, OcpiServer } from '@citrineos/ocpi-base';
import { Container } from 'typedi';
import { VersionsModule } from '@citrineos/ocpi-versions';
import { CredentialsModule } from '@citrineos/ocpi-credentials';

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
