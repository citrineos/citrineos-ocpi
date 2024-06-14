import { Service } from "typedi";
import { ILogObj, Logger } from "tslog";
import { OcpiServerConfig } from "./ocpi.server.config";

@Service()
export class OcpiLoggerConfig {
  logger: Logger<ILogObj>

  constructor(serverConfig: OcpiServerConfig) {
    this.logger = new Logger<ILogObj>({
      name: 'CitrineOS Logger',
      minLevel: serverConfig.logLevel
    });
  }
}
