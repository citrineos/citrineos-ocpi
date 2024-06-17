import {
  AbstractModule, AsHandler,
  CallAction, EventGroup, HandlerProperties,
  ICache, IMessage,
  IMessageHandler, IMessageSender, NotifyEventRequest, StatusNotificationRequest,
  SystemConfig
} from "@citrineos/base";
import { RabbitMqReceiver, RabbitMqSender, Timer } from "@citrineos/util";
import { ILogObj, Logger } from "tslog";
import deasyncPromise from "deasync-promise";


/**
 * Component that handles provisioning related messages.
 */
export class LocationsOcppHandlers extends AbstractModule {
  /**
   * Fields
   */
  protected _requests: CallAction[] = [
    CallAction.NotifyEvent,
    CallAction.StatusNotification
  ];
  protected _responses: CallAction[] = [
  ];

  /**
   * This is the constructor function that initializes the {@link LocationsOcppHandlers}.
   *
   * @param {SystemConfig} config - The `config` contains configuration settings for the module.
   *
   * @param {ICache} [cache] - The cache instance which is shared among the modules & Central System to pass information such as blacklisted actions or boot status.
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
    handler?: IMessageHandler,
    sender?: IMessageSender,
    logger?: Logger<ILogObj>,
  ) {
    super(
      config,
      cache,
      handler || new RabbitMqReceiver(config, logger),
      sender || new RabbitMqSender(config, logger),
      EventGroup.Locations,
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

  /**
   * Handle requests
   */
  @AsHandler(CallAction.NotifyEvent)
  protected _handleNotifyEvent(
    message: IMessage<NotifyEventRequest>,
    props?: HandlerProperties,
  ): void {
    this._logger.debug('NotifyEvent received:', message, props);

    // TODO push EVSE or CONNECTOR update to MSP, without needing to send a response
  }

  @AsHandler(CallAction.StatusNotification)
  protected _handleStatusNotification(
    message: IMessage<StatusNotificationRequest>,
    props?: HandlerProperties,
  ): void {
    this._logger.debug('StatusNotification received:', message, props);

    // TODO push CONNECTOR update to MSP, without needing to send a response
  }
}
