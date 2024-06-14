import { Service } from "typedi";
import { RabbitMqReceiver, RabbitMqSender } from "@citrineos/util";
import { SystemConfig } from "@citrineos/base";
import { OcpiServerConfig } from "./ocpi.server.config";
import { OcpiLoggerConfig } from "./ocpi.logger.config";

@Service()
export class OcpiMessageSenderConfig {
  constructor(
    config: OcpiServerConfig,
    loggerConfig: OcpiLoggerConfig
  ) {
    return new RabbitMqSender(config as SystemConfig, loggerConfig.logger);
  }
}

@Service()
export class OcpiMessageReceiverConfig {
  constructor(
    config: OcpiServerConfig,
    loggerConfig: OcpiLoggerConfig
  ) {
    return new RabbitMqReceiver(config as SystemConfig, loggerConfig.logger);
  }
}
