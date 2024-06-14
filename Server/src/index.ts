import 'reflect-metadata';
import { OcpiServer } from '@citrineos/ocpi-base';
import { Container } from 'typedi';
import { OcpiModuleConfig } from '@citrineos/ocpi-base/dist/config/ocpi.module.config';
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
