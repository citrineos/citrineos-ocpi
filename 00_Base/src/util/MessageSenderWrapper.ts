import { IMessageSender } from '@citrineos/base';

export class MessageSenderWrapper {
  sender: IMessageSender;

  constructor(sender: IMessageSender) {
    this.sender = sender;
  }
}
