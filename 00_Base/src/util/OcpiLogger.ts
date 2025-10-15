// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Service, Container } from 'typedi';
import { ILogObj, Logger } from 'tslog';
import { ServerConfig } from '../config/ServerConfig';
import { Env } from '../config/sub/Env';

@Service()
export class OcpiLogger extends Logger<ILogObj> {
  constructor() {
    // Try to get ServerConfig from container, fallback to defaults if not available
    let serverConfig: ServerConfig | undefined;
    try {
      serverConfig = Container.get('ServerConfig');
    } catch (_error) {
      // ServerConfig not yet available, use defaults
    }

    super({
      name: 'CitrineOS Ocpi Logger',
      minLevel: serverConfig?.logLevel || 2, // Default to info level
      hideLogPositionForProduction:
        serverConfig?.env === Env.PRODUCTION || false,
      // Disable colors for cloud deployment as some cloud logging environments such as cloudwatch can not interpret colors
      stylePrettyLogs: serverConfig?.env !== Env.DEVELOPMENT || true,
    });
  }
}
