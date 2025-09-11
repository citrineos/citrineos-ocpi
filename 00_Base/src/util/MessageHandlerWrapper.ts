// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { IMessageHandler } from '@citrineos/base';

export class MessageHandlerWrapper {
  handler: IMessageHandler;

  constructor(handler: IMessageHandler) {
    this.handler = handler;
  }
}
