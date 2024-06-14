import { Service } from "typedi";
import { RabbitMqReceiver, RabbitMqSender } from "@citrineos/util";
import { IMessageHandler, IMessageSender, SystemConfig } from "@citrineos/base";
import { OcpiServerConfig } from "./ocpi.server.config";
import { OcpiLoggerConfig } from "./ocpi.logger.config";

@Service()
export class OcpiMessageSenderConfig {
  sender: IMessageSender;

  constructor(
    config: OcpiServerConfig,
    loggerConfig: OcpiLoggerConfig
  ) {
    this.sender = new RabbitMqSender(config as SystemConfig, loggerConfig.logger);
  }
}

@Service()
export class OcpiMessageHandlerConfig {
  handler: IMessageHandler;

  constructor(
    config: OcpiServerConfig,
    loggerConfig: OcpiLoggerConfig
  ) {
    this.handler = new RabbitMqReceiver(config as SystemConfig, loggerConfig.logger);
  }
}
