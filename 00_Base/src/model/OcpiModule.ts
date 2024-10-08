import { Constructable } from 'typedi';
import { IMessageHandler, IMessageSender } from '@citrineos/base';

export interface OcpiModule {
  init(handler?: IMessageHandler | any, sender?: IMessageSender | any): void; // need | any otherwise TS confused because import comes from different moduels

  getController(): Constructable<any>;
}
