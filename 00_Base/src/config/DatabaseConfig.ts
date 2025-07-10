// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

/**
 * Minimal database configuration interface for OCPI repositories
 * This replaces the need for the full ServerConfig in repository constructors
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sync: boolean;
}

/**
 * Simple environment enum for OCPI
 */
export enum Env {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}
