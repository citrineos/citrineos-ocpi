import {
  AbstractModule,
  AsHandler,
  CallAction,
  EventDataType,
  EventGroup,
  HandlerProperties,
  ICache,
  IMessage,
  IMessageHandler,
  IMessageSender,
  NotifyEventRequest,
  StatusNotificationRequest,
  SystemConfig
} from "@citrineos/base";
import { RabbitMqReceiver, RabbitMqSender, Timer } from "@citrineos/util";
import { ILogObj, Logger } from "tslog";
import deasyncPromise from "deasync-promise";
import { CONNECTOR_COMPONENT, EVSE_COMPONENT, LocationsClientApi, LocationsService } from "@citrineos/ocpi-base";


/**
 * Component that handles provisioning related messages.
 */
export class LocationsHandlers extends AbstractModule {
  // TODO read database events for LOCATION updates
  // not necessarily in this file, just as a general reminder

  locationsService: LocationsService;
  locationsClientApi: LocationsClientApi;

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
   * This is the constructor function that initializes the {@link LocationsHandlers}.
   *
   * @param {SystemConfig} config - The `config` contains configuration settings for the module.
   *
   * @param {ICache} [cache] - The cache instance which is shared among the modules & Central System to pass information such as blacklisted actions or boot status.
   *
   * @param locationsService
   * @param locationsClientApi
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
    locationsService: LocationsService,
    locationsClientApi: LocationsClientApi,
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

    this.locationsService = locationsService;
    this.locationsClientApi = locationsClientApi;

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
  protected async _handleNotifyEvent(
    message: IMessage<NotifyEventRequest>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('NotifyEvent received:', message, props);

    const stationId = message.context.stationId;

    const events = message.payload.eventData as EventDataType[];
    for (const event of events) {
      const component = event.component;
      const variable = event.variable;

      if (component.name !== EVSE_COMPONENT && component.name !== CONNECTOR_COMPONENT) {
        this._logger.debug('Ignoring NotifyEvent since it is not a processed OCPI event.');
      } else if (component.name === EVSE_COMPONENT) {
        const evseId = component.evse?.id ?? 1; // TODO better fallback
        const params = await this.locationsService.processEvseUpdate(
          stationId, evseId, new Date());
        await this.locationsClientApi.patchEvse(params);
      } else if (component.name === CONNECTOR_COMPONENT) {
        const connectorId = component.evse?.connectorId ?? 1; // TODO better fallback
        const evseId = component.evse?.id ?? 1; // TODO better fallback
        const params = await this.locationsService.processConnectorUpdate(
          stationId, evseId, connectorId, new Date());
        await this.locationsClientApi.patchConnector(params);      }
    }
  }

  @AsHandler(CallAction.StatusNotification)
  protected async _handleStatusNotification(
    message: IMessage<StatusNotificationRequest>,
    props?: HandlerProperties,
  ): Promise<void> {
    this._logger.debug('StatusNotification received:', message, props);

    const stationId = message.context.stationId;
    const evseId = message.payload.evseId;
    const connectorId = message.payload.connectorId;
    const params = await this.locationsService.processConnectorUpdate(
      stationId, evseId, connectorId, new Date(message.payload.timestamp));
    await this.locationsClientApi.patchConnector(params);
  }

}
