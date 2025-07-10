// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Buffer } from 'node:buffer';
import { ILogObj, Logger } from 'tslog';
import { OcpiConfig } from './types';
import { OcpiConfigStore } from './OcpiConfigStore';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Local storage implementation for OCPI configuration
 */
export class OcpiLocalStorage implements OcpiConfigStore {
  protected readonly _logger: Logger<ILogObj>;
  private defaultFilePath: string;
  private configFileName: string;
  private configDir: string | undefined;

  constructor(
    defaultFilePath: string,
    configFileName: string,
    configDir?: string,
    logger?: Logger<ILogObj>,
  ) {
    this.defaultFilePath = defaultFilePath;
    this.configFileName = configFileName;
    this.configDir = configDir;
    this._logger = logger
      ? logger.getSubLogger({ name: this.constructor.name })
      : new Logger<ILogObj>({ name: this.constructor.name });
  }

  async saveFile(
    fileName: string,
    content: Buffer,
    filePath?: string,
  ): Promise<string> {
    const absoluteFilePath = path.join(
      process.cwd(),
      filePath ? filePath : this.defaultFilePath,
      `/${fileName}`,
    );

    // Ensure directory exists
    const dir = path.dirname(absoluteFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(absoluteFilePath, content, 'utf-8');
    return absoluteFilePath;
  }

  async getFile(id: string, filePath?: string): Promise<string | undefined> {
    const absoluteFilePath = path.join(
      process.cwd(),
      filePath ? filePath : this.defaultFilePath,
      `/${id}`,
    );
    if (!fs.existsSync(absoluteFilePath)) {
      return;
    }
    return fs.readFileSync(absoluteFilePath, 'utf-8');
  }

  async fetchConfig(): Promise<OcpiConfig | null> {
    try {
      const configString = await this.getFile(
        this.configFileName,
        this.configDir,
      );
      if (!configString) return null;
      return JSON.parse(configString) as OcpiConfig;
    } catch (error) {
      this._logger.error(
        'Error fetching OCPI config from local storage:',
        error,
      );
      return null;
    }
  }

  async saveConfig(config: OcpiConfig): Promise<void> {
    try {
      await this.saveFile(
        this.configFileName,
        Buffer.from(JSON.stringify(config, null, 2)),
        this.configDir,
      );
      this._logger.info('OCPI config saved locally.');
    } catch (error) {
      this._logger.error('Error saving OCPI config to local storage:', error);
    }
  }
}
