import { IMessageHandler } from '../../../../citrineos-core/00_Base';

export class MessageHandlerWrapper {
  handler: IMessageHandler;

  constructor(handler: IMessageHandler) {
    this.handler = handler;
  }
}
