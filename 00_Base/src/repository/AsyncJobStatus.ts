import { Service } from 'typedi';
import { SequelizeRepository } from '@citrineos/data';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { SystemConfig } from '@citrineos/base';
import { ILogObj, Logger } from 'tslog';
import { AsyncJobStatus } from '../model/AsyncJobStatus';

@Service()
export class AsyncJobStatusRepository extends SequelizeRepository<AsyncJobStatus> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
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
