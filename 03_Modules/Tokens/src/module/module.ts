// Copyright (c) 2023 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import {
  AbstractModule,
  AsHandler,
  AuthorizeRequest,
  CallAction,
  EventGroup,
  HandlerProperties,
  ICache,
  IMessage,
  IMessageHandler,
  IMessageSender,
  SystemConfig,
} from '@citrineos/base';
import { RabbitMqReceiver, RabbitMqSender, Timer } from '@citrineos/util';
import deasyncPromise from 'deasync-promise';
import { ILogObj, Logger } from 'tslog';
import {
  CountryCode,
  Role,
  TokensService,
} from '@citrineos/ocpi-base';
import { Service } from 'typedi';
import { WhitelistType } from '@citrineos/ocpi-base/dist/model/WhitelistType';

/**
 * Component that handles provisioning related messages.
 */
@Service()
export class TokensHandlers extends AbstractModule {
  /**
   * Fields
   */
  protected _requests: CallAction[] = [CallAction.Authorize];
  protected _responses: CallAction[] = [];

  /**
   * This is the constructor function that initializes the {@link Tokens}.
   *
   * @param {SystemConfig} config - The `config` contains configuration settings for the module.
   *
   * @param {ICache} [cache] - The cache instance which is shared among the modules & Central System to pass information such as blacklisted actions or boot status.
   *
   * @param {TokensService} [service] - The `service` parameter represents an instance of the {@link TokensService} class.
   *
   * @param {IMessageSender} [sender] - The `sender` parameter is an optional parameter that represents an instance of the {@link IMessageSender} interface.
   * It is used to send messages from the central system to external systems or devices. If no `sender` is provided, a default {@link RabbitMqSender} instance is created and used.
   *
   * @param {IMessageHandler} [handler] - The `handler` parameter is an optional parameter that represents an instance of the {@link IMessageHandler} interface.
   * It is used to handle incoming messages and dispatch them to the appropriate methods or functions. If no `handler` is provided, a default {@link RabbitMqReceiver} instance is created and used.
   *
   * @param {Logger<ILogObj>} [logger] - The `logger` parameter is an optional parameter that represents an instance of {@link Logger<ILogObj>}.
   * It is used to propagate system-wide logger settings and will serve as the parent logger for any sub-component logging. If no `logger` is provided, a default {@link Logger<ILogObj>} instance is created and used.
   *
   */
  constructor(
    config: SystemConfig,
    cache: ICache,
    readonly service: TokensService,
    sender?: IMessageSender,
    handler?: IMessageHandler,
    logger?: Logger<ILogObj>,
  ) {
    super(
      config,
      cache,
      handler || new RabbitMqReceiver(config, logger),
      sender || new RabbitMqSender(config, logger),
      EventGroup.Tokens,
      logger,
    );

    const timer = new Timer();
    this._logger.info('Initializing...');

    if (!deasyncPromise(this._initHandler(this._requests, this._responses))) {
      throw new Error(
        'Could not initialize module due to failure in handler initialization.',
      );
    }

    this._logger.info(`Initialized in ${timer.end()}ms...`);
  }

  @AsHandler(CallAction.Authorize)
  protected async _handleAuthorizeRequest(
    message: IMessage<AuthorizeRequest>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('Handling:', message, props);
    const idToken = message.payload.idToken;

    // TODO: We need to decide how OCPI and OCPP work together for the real-time authorization
    // TODO: we need a way to figure out the countryCode and partyId of the given idToken
    const token = await this.service.getTokenByIdTokenType(
      CountryCode.US,
      Role.EMSP,
      idToken,
    );
    if (token) {
      if (
        token.whitelist === WhitelistType.NEVER ||
        token.whitelist === WhitelistType.ALLOWED_OFFLINE
      ) {
        try {
          // TODO: Implement send post Real-time authorization request and store the authorization response
        } catch (e) {
          this._logger.error(`Error while getting token: ${JSON.stringify(e)}`);
          if (token.whitelist !== WhitelistType.ALLOWED_OFFLINE) {
            // TODO:Reject the authorization
          }
        }
      }
    } else {
      this._logger.warn(`Token by ${JSON.stringify(idToken)} not found`);
      // TODO:Reject the authorization
    }
  }
}
