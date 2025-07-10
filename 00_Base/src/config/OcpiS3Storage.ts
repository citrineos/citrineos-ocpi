// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Buffer } from 'node:buffer';
import { ILogObj, Logger } from 'tslog';
import { OcpiConfig } from './types';
import { OcpiConfigStore } from './OcpiConfigStore';

// Define S3 configuration interface
interface S3Config {
  endpoint?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  s3ForcePathStyle?: boolean;
  defaultBucketName: string;
}

/**
 * S3 storage implementation for OCPI configuration
 * This is a simplified version that doesn't depend on AWS SDK
 * to avoid adding dependencies to the OCPI base module
 */
export class OcpiS3Storage implements OcpiConfigStore {
  protected readonly _logger: Logger<ILogObj>;
  private s3Config: S3Config;
  private configFileName: string;
  private configBucketName: string | undefined;

  constructor(
    s3Config: S3Config,
    configFileName: string,
    configDir?: string,
    logger?: Logger<ILogObj>,
  ) {
    this.s3Config = s3Config;
    this.configFileName = configFileName;
    this.configBucketName = configDir;
    this._logger = logger
      ? logger.getSubLogger({ name: this.constructor.name })
      : new Logger<ILogObj>({ name: this.constructor.name });
  }

  async saveFile(
    _fileName: string,
    _content: Buffer,
    _filePath?: string,
  ): Promise<string> {
    // This is a placeholder implementation
    // In a real implementation, you would use AWS SDK or similar
    this._logger.warn(
      'S3Storage is not fully implemented yet - using local fallback',
    );
    throw new Error(
      'S3Storage implementation required - please implement AWS SDK integration',
    );
  }

  async getFile(_id: string, _filePath?: string): Promise<string | undefined> {
    // This is a placeholder implementation
    // In a real implementation, you would use AWS SDK or similar
    this._logger.warn(
      'S3Storage is not fully implemented yet - using local fallback',
    );
    throw new Error(
      'S3Storage implementation required - please implement AWS SDK integration',
    );
  }

  async fetchConfig(): Promise<OcpiConfig | null> {
    try {
      const configString = await this.getFile(
        this.configFileName,
        this.configBucketName,
      );
      if (!configString) return null;
      return JSON.parse(configString) as OcpiConfig;
    } catch (error) {
      this._logger.error('Error fetching OCPI config from S3:', error);
      return null;
    }
  }

  async saveConfig(config: OcpiConfig): Promise<void> {
    try {
      await this.saveFile(
        this.configFileName,
        Buffer.from(JSON.stringify(config, null, 2)),
        this.configBucketName,
      );
      this._logger.info('OCPI config saved to S3.');
    } catch (error) {
      this._logger.error('Error saving OCPI config to S3:', error);
      throw error;
    }
  }
}
