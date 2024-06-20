import { Constructable } from 'typedi';
import { IMessageHandler, IMessageSender } from '@citrineos/base';

export abstract class OcpiModule {
  public abstract init(
    handler?: IMessageHandler,
    sender?: IMessageSender,
  ): void;

  public abstract getController(): Constructable<any>;
}
