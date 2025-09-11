// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { IMessageSender } from '@citrineos/base';

export class MessageSenderWrapper {
  sender: IMessageSender;

  constructor(sender: IMessageSender) {
    this.sender = sender;
  }
}
