import { SystemConfig } from '@citrineos/base';
import { IDtoClient } from '..';
import { Client } from 'pg';

export class PgNotifyClient implements IDtoClient {
  protected _pgClient: Client;

  constructor(config: SystemConfig['data']['sequelize']) {
    this._pgClient = new Client({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    });
  }

  async init(): Promise<void> {
    await this._pgClient.connect();
    // Reconnect logic
    this._pgClient.on('error', async (err) => {
      console.error('Postgres connection error:', err);
      // Attempt to reconnect
    });

    this._pgClient.on('end', async () => {
      console.log('Postgres connection ended, reconnecting...');
      // Attempt to reconnect
    });
  }

  async subscribe(
    eventId: string,
    handleEvent: (event: any) => void,
    handleError: (error: any) => void,
    handleDisconnect?: () => void,
  ): Promise<boolean> {
    try {
      await this._pgClient.query(`LISTEN ${eventId}`);
      this._pgClient.on('notification', (msg) => {
        if (msg.channel !== eventId) {
          return;
        }
        try {
          const event = JSON.parse(msg.payload || '{}');
          handleEvent(event);
        } catch (error) {
          console.error(`Error parsing event payload for ${eventId}:`, error);
          handleError(error);
        }
      });
      // Handle connection drops gracefully
      this._pgClient.on('error', async (err) => {
        console.error('Postgres connection error:', err);
        handleDisconnect?.();
      });

      this._pgClient.on('end', async () => {
        console.log('Postgres connection ended, reconnecting...');
        handleDisconnect?.();
      });
      return true;
    } catch (error) {
      console.error(`Failed to subscribe to event ${eventId}:`, error);
      return false;
    }
  }

  shutdown(): void {
    throw new Error('Method not implemented.');
  }
}
