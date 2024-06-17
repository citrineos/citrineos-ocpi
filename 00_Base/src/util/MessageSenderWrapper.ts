import { IMessageSender } from '../../../../citrineos-core/00_Base';

export class MessageSenderWrapper {
  sender: IMessageSender;

  constructor(sender: IMessageSender) {
    this.sender = sender;
  }
}
