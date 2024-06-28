import {
  AbstractModule,
  AsHandler,
  CallAction,
  ConnectorStatusEnumType,
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
import {
  CONNECTOR_COMPONENT,
  EVSE_COMPONENT,
  AVAILABILITY_STATE_VARIABLE,
  LocationsService, EvseDTO, ConnectorDTO,
} from '@citrineos/ocpi-base';
import { CitrineOcpiLocationMapper } from '@citrineos/ocpi-base/dist/mapper/CitrineOcpiLocationMapper';


/**
 * Component that handles provisioning related messages.
 */
export class LocationsHandlers extends AbstractModule {
  locationsService: LocationsService;

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
   * @param {LocationsService} [locationsService] - The LocationsService holds the business logic necessary to process incoming handled requests.
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

    const evseUpdateMap: Record<number, Partial<EvseDTO>> = {};
    const connectorUpdateMap: Record<number, Record<number, Partial<ConnectorDTO>>> = {}

    for (const event of events) {
      const component = event.component;
      const variable = event.variable

      if ((component.name !== EVSE_COMPONENT && component.name !== CONNECTOR_COMPONENT)) {
        this._logger.debug('Ignoring NotifyEvent since it is not a processed OCPI event.');
      } else if (component.name === EVSE_COMPONENT && variable.name === AVAILABILITY_STATE_VARIABLE) { // TODO add logic to process other variable attribute values used for OCPI mapping
        const evseId = component.evse?.id ?? 1; // TODO better fallback
        const partialEvse: Partial<EvseDTO> = {};
        partialEvse.status = CitrineOcpiLocationMapper.mapOCPPAvailabilityStateToOCPIEvseStatus( event.actualValue);
        // TODO use the message context timestamp when it's merged into 1.3.0
        // partialEvse.last_updated = new Date(message.context.timestamp);
        partialEvse.last_updated = new Date();
        evseUpdateMap[evseId] = partialEvse;
      } else if (component.name === CONNECTOR_COMPONENT && variable.name === AVAILABILITY_STATE_VARIABLE) {
        // TODO add logic to process other variable attribute values used for OCPI mapping
        const status = event.actualValue;
        const connectorId = component.evse?.connectorId ?? 1; // TODO better fallback
        const evseId = component.evse?.id ?? 1; // TODO better fallback
        const partialConnector: Partial<ConnectorDTO> = {};
        // TODO use the message context timestamp when it's merged into 1.3.0
        // partialConnector.last_updated = new Date(message.context.timestamp);
        partialConnector.last_updated = new Date();
        connectorUpdateMap[evseId][connectorId] = partialConnector;
      }
    }

    // TODO consolidate EVSE updates between EVSE and Connector
    for (let [evseId, partialEvse] of Object.entries(evseUpdateMap)) {
      await this.locationsService.processEvseUpdate(stationId, Number(evseId), partialEvse);
    }

    for (let [evseId, connectorsMap] of Object.entries(connectorUpdateMap)) {
      for (let [connectorId, partialConnector] of Object.entries(connectorsMap)) {
        await this.locationsService.processConnectorUpdate(stationId, Number(evseId), Number(connectorId), partialConnector);
      }
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
    const partialConnector: Partial<ConnectorDTO> = {};
    partialConnector.last_updated =  new Date(message.payload.timestamp);

    await this.locationsService.processConnectorUpdate(stationId, evseId, connectorId, partialConnector);
  }

}
