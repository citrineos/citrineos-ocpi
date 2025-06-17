// Copyright (c) 2025 S44, LLC
// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { ICache, SystemConfig } from '@citrineos/base';

/**
 *  Data Transfer Object (DTO) event types for operations.
 */
export enum DtoEventType {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

/**
 * Object types corresponding to Data Transfer Objects (DTOs) in the system.
 */
export enum DtoEventObjectType {
  CDR = 'CDR',
  CHARGING_PROFILE = 'CHARGING_PROFILE',
  COMMAND = 'COMMAND',
  CREDENTIAL = 'CREDENTIAL',
  LOCATION = 'LOCATION',
  SESSION = 'SESSION',
  TARIFF = 'TARIFF',
  TOKEN = 'TOKEN',
  VERSION = 'VERSION',
}

/**
 * Event context for DTO operations
 */
export interface IDtoEventContext {
  eventType: DtoEventType;
  objectType: DtoEventObjectType;
}

/**
 * DTO event payload
 */
export interface IDtoPayload {}

/**
 * Dto event interface
 */
export interface IDtoEvent {
  /**
   * The event identifier
   */
  get eventId(): string;
  set eventId(value: string);

  /**
   * The context of the event
   */
  get context(): IDtoEventContext;
  set context(value: IDtoEventContext);

  /**
   * The payload of the event
   */
  get payload(): IDtoPayload;
  set payload(value: IDtoPayload);
}

/**
 * Dto event receiver interface
 */
export interface IDtoEventReceiver {
  /**
   * Subscribes to Dto mutation events based on mutation types and object types.
   *
   * @param eventId - The event identifier.
   * @param mutation - The Dto mutation type.
   * @param objectType - The Dto object type.
   * @param filter - Optional. An additional event context filter.
   * @returns A promise that resolves to a boolean value indicating whether the event was successful.
   */
  subscribe(
    eventType: DtoEventType,
    objectType: DtoEventObjectType,
    filter?: { [k: string]: string },
  ): Promise<boolean>;

  /**
   * Handles incoming Dto events.
   * @param event - The event to be handled.
   */
  handle(event: IDtoEvent): void;

  /**
   * Shuts down the handler.
   */
  shutdown(): Promise<void>;

  get module(): IDtoModule | undefined;
  set module(value: IDtoModule | undefined);
}

/**
 * Base interface for Dto modules
 */
export interface IDtoModule {
  config: SystemConfig;
  receiver: IDtoEventReceiver;

  /**
   * Handles incoming Dto events
   */
  handle(event: IDtoEvent): Promise<void>;

  /**
   * Shuts down the module
   */
  shutdown(): Promise<void>;
}

/**
 * Dto event sender interface
 */
export interface IDtoEventSender {
  /**
   * Sends a Dto event to the upstream service.
   *
   * @param event - The event object.
   * @param payload - The payload object.
   * @returns A promise that resolves to a boolean indicating whether the event was successfully sent.
   * @throws {Error} If the event cannot be sent.
   */
  sendEvent(event: IDtoEvent): Promise<boolean>;

  /**
   * Shuts down the sender.
   */
  shutdown(): Promise<void>;
}

export interface IDtoEventSubscriber {
  /**
   * Initializes the Dto event subscriber.
   *
   * @returns A promise that resolves when the subscriber is initialized.
   */
  init(): Promise<void>;

  /**
   * Subscribes to a Dto event.
   *
   * @param eventId - The identifier of the event to subscribe to.
   * @param handleEvent - The function to handle the event when it occurs.
   * @param handleError - The function to handle errors that occur during subscription.
   * @param handleDisconnect - Optional. The function to handle disconnection events.
   * @returns A promise that resolves to a boolean indicating whether the subscription was successful.
   */
  subscribe(
    eventId: string,
    handleEvent: () => void,
    handleError: (error: any) => void,
    handleDisconnect?: () => void,
  ): Promise<boolean>;

  shutdown(): void;
}

/**
 * Interface for the Dto router that subscribes to Dto websockets
 * and routes events to RabbitMQ for upstream processing
 */
export interface IDtoRouter {
  sender: IDtoEventSender;
  /**
   * The Dto client for producing events
   */
  subscriber: IDtoEventSubscriber;

  /**
   * Subscribes to Dto events
   */
  subscribe(
    eventId: string,
    eventType: DtoEventType,
    objectType: DtoEventObjectType,
  ): Promise<boolean>;

  /**
   * Shuts down the router
   */
  shutdown(): Promise<void>;
}

/**
 * Default implementations
 */

/**
 * Default implementation of IDtoEvent
 */
export class DtoEvent implements IDtoEvent {
  /**
   * Fields
   */
  protected _eventId: string;
  protected _context: IDtoEventContext;
  protected _payload: IDtoPayload;

  /**
   * Constructs a new instance of DtoEvent.
   *
   * @param {DtoEventType} eventType - The type of the event.
   * @param {DtoObjectType} objectType - The object type of the event.
   * @param {IDtoEventContext} context - The context of the event.
   * @param {IDtoPayload} payload - The payload of the event.
   */
  constructor(
    eventId: string,
    context: IDtoEventContext,
    payload: IDtoPayload,
    eventType?: DtoEventType,
    objectType?: DtoEventObjectType,
  ) {
    this._eventId = eventId;
    this._context = context;
    this._payload = payload;
    this._context.eventType = eventType || context.eventType;
    this._context.objectType = objectType || context.objectType;
  }

  /**
   * Getter & Setter
   */
  get eventId(): string {
    return this._eventId;
  }
  get context(): IDtoEventContext {
    return this._context;
  }
  get payload(): IDtoPayload {
    return this._payload;
  }
}
