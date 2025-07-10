import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { ServerConfig } from '../config/ServerConfig';
import { OcpiSequelizeInstance } from '../util/OcpiSequelizeInstance';
import { SystemConfig } from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { AsyncJobStatus } from '../model/AsyncJobStatus';

@Service()
export class AsyncJobStatusRepository extends SequelizeRepository<AsyncJobStatus> {
  constructor(
    systemConfig: ServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      systemConfig as unknown as SystemConfig,
      'AsyncJobStatus',
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }

  async createAsyncJobStatus(
    jobStatus: AsyncJobStatus,
  ): Promise<AsyncJobStatus> {
    return await this._create(jobStatus);
  }

  async updateAsyncJobStatus(
    jobStatus: Partial<AsyncJobStatus>,
  ): Promise<AsyncJobStatus> {
    const updatedJobStatus = await this.updateByKey(
      jobStatus,
      jobStatus.jobId!,
    );
    if (!updatedJobStatus) {
      throw new Error(
        `Failed to update job status: AsyncJobStatus ${jobStatus.jobId} not found`,
      );
    }
    return updatedJobStatus;
  }
}
