import { SystemConfig } from '@citrineos/base';
import { DtoEventType, IDtoEventSubscriber, IDtoPayload } from '..';
import { Client } from 'pg';
import { runner, RunnerOption } from 'node-pg-migrate';
import path from 'path';
import { ILogObj, Logger } from 'tslog';

interface IPgNotification {
  operation: DtoEventType;
  data: any;
}

export class PgNotifyEventSubscriber implements IDtoEventSubscriber {
  protected _pgClient: Client;
  protected readonly _logger: Logger<ILogObj>;

  constructor(
    config: SystemConfig['data']['sequelize'],
    logger?: Logger<ILogObj>,
  ) {
    this._logger = logger
      ? logger.getSubLogger({ name: this.constructor.name })
      : new Logger<ILogObj>({ name: this.constructor.name });
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

    const runnerOptions: RunnerOption = {
      dbClient: this._pgClient,
      migrationsTable: 'pgmigrations',
      dir: path.join(__dirname, 'migrations'),
      direction: 'up',
      logger: this._logger,
    };
    const migrations = await runner(runnerOptions);
    this._logger.info(
      `Executed migrations: ${migrations.map((m) => m.name).join(', ')}`,
    );

    // Reconnect logic
    this._pgClient
      .on('error', async (err) => {
        console.error('Postgres connection error:', err);
        // Attempt to reconnect
      })
      .on('end', async () => {
        console.log('Postgres connection ended, reconnecting...');
        // Attempt to reconnect
      });
  }

  async subscribe<T extends IDtoPayload>(
    eventId: string,
    handleEvent: (event: { eventType: DtoEventType; payload: T }) => void,
    handleError: (error: any) => void,
    handleDisconnect?: () => void,
  ): Promise<boolean> {
    try {
      await this._pgClient.query(`LISTEN ${eventId}`);
      this._pgClient
        .on('notification', (msg) => {
          if (msg.channel !== eventId) {
            return;
          }
          try {
            const notificationPayload: IPgNotification = JSON.parse(
              msg.payload || '{}',
            );
            handleEvent({
              eventType: notificationPayload.operation,
              payload: notificationPayload.data,
            });
          } catch (error) {
            console.error(`Error parsing event payload for ${eventId}:`, error);
            handleError(error);
          }
        })
        .on('error', async (err) => {
          console.error('Postgres connection error:', err);
          handleDisconnect?.();
        })
        .on('end', async () => {
          console.log('Postgres connection ended, reconnecting...');
          handleDisconnect?.();
        });
      return true;
    } catch (error) {
      console.error(`Failed to subscribe to event ${eventId}:`, error);
      return false;
    }
  }

  async shutdown(): Promise<void> {
    this._pgClient.end();
  }
}
