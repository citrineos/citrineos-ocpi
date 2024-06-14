import { Service } from "typedi";
import { RabbitMqReceiver, RabbitMqSender } from "@citrineos/util";
import { IMessageHandler, IMessageSender, SystemConfig } from "@citrineos/base";
import { OcpiServerConfig } from "./ocpi.server.config";
import { OcpiLogger } from "../util/ocpi.logger";

@Service()
export class OcpiMessageSenderConfig {
  sender: IMessageSender;

  constructor(
    config: OcpiServerConfig,
    logger: OcpiLogger
  ) {
    this.sender = new RabbitMqSender(config as SystemConfig, logger);
  }
}

@Service()
export class OcpiMessageHandlerConfig {
  handler: IMessageHandler;

  constructor(
    config: OcpiServerConfig,
    logger: OcpiLogger
  ) {
    this.handler = new RabbitMqReceiver(config as SystemConfig, logger);
  }
}
