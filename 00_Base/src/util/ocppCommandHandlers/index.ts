// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Import all OCPP command handlers, so that they are resolved by @InjectMany
 */
import './OCPP1_6_CommandHandler';
import './OCPP2_0_1_CommandHandler';

export { OCPP1_6_CommandHandler } from './OCPP1_6_CommandHandler';
export { OCPP2_0_1_CommandHandler } from './OCPP2_0_1_CommandHandler';
export { OCPP_COMMAND_HANDLER, OCPPCommandHandler } from './base';
