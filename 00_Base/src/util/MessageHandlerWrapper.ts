import { IMessageHandler } from '@citrineos/base';

export class MessageHandlerWrapper {
  handler: IMessageHandler;

  constructor(handler: IMessageHandler) {
    this.handler = handler;
  }
}
