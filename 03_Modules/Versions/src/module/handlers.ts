// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  AbstractModule,
  CallAction, EventGroup,
  ICache,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import {
  RabbitMqReceiver,
  RabbitMqSender,
  Timer,
} from '@citrineos/util';
import deasyncPromise from 'deasync-promise';
import { ILogObj, Logger } from 'tslog';

export class VersionsOcppHandlers {

}
