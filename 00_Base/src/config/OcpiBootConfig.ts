// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

/**
 * OCPI Boot Configuration
 * Configuration for OCPI system startup and initialization
 */
export interface OcpiBootConfig {
  /**
   * System status for OCPI server
   */
  status: string;

  /**
   * Additional status information
   */
  statusInfo?: object | null;

  /**
   * OCPI version to use
   */
  ocpiVersion?: string | null;

  /**
   * Auto-accept new connections
   */
  autoAcceptConnections?: boolean | null;

  /**
   * Connection retry interval in seconds
   */
  connectionRetryInterval?: number | null;

  /**
   * Maximum number of connection retries
   */
  maxConnectionRetries?: number | null;

  /**
   * Token cache refresh interval in seconds
   */
  tokenCacheRefreshInterval?: number | null;

  /**
   * Location publish interval in seconds
   */
  locationPublishInterval?: number | null;

  /**
   * CDR auto-generation enabled
   */
  cdrAutoGeneration?: boolean | null;

  /**
   * Session timeout in seconds
   */
  sessionTimeout?: number | null;
}

/**
 * Cache boot status is used to keep track of the overall boot process for OCPI.
 * When starting the OCPI server, this helps mediate the initialization behavior.
 */
export const OCPI_BOOT_STATUS = 'ocpi_boot_status';
