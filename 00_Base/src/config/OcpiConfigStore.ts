// Copyright Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache 2.0

import { Buffer } from 'node:buffer';
import { OcpiConfig } from './types';

// Define the interface directly to avoid version compatibility issues
export interface IFileStorage {
  /**
   * Save a file
   * @param fileName Name of the file
   * @param content File content
   * @param filePath The path of the file, if not in root. Used as the bucket name for S3.
   * @returns The ID of the file
   */
  saveFile(
    fileName: string,
    content: Buffer,
    filePath?: string,
  ): Promise<string>;

  /**
   * Get a file
   * @param id The ID of the file
   * @param filePath The path of the file, if not included in the ID. Used as the bucket name for S3.
   * @returns The file content
   */
  getFile(id: string, filePath?: string): Promise<string | undefined>;
}

export interface OcpiConfigStore extends IFileStorage {
  fetchConfig(): Promise<OcpiConfig | null>;
  saveConfig(config: OcpiConfig): Promise<void>;
}

export class OcpiConfigStoreFactory {
  private static instance: OcpiConfigStore | null = null;

  static setConfigStore(configStorage: OcpiConfigStore): OcpiConfigStore {
    if (this.instance === null) {
      this.instance = configStorage;
    } else {
      console.warn('OcpiConfigStore has already been initialized.');
    }
    return this.instance;
  }

  static getInstance(): OcpiConfigStore {
    if (this.instance === null) {
      throw new Error(
        'OcpiConfigStore has not been initialized. Call OcpiConfigStoreFactory.setConfigStore() first.',
      );
    }
    return this.instance;
  }
}
