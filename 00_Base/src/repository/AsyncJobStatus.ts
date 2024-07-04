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

  async createOrUpdateAsyncJobStatus(
    jobStatus: AsyncJobStatus,
  ): Promise<AsyncJobStatus> {
    if (
      !jobStatus.jobId ||
      (await this.readAllByQuery({ where: { jobId: jobStatus.jobId } }))
        .length === 0
    ) {
      return await this._create(jobStatus);
    } else {
      const updatedJobStatus = await this.updateByKey(
        jobStatus.dataValues,
        jobStatus.jobId,
      );
      if (!updatedJobStatus) {
        throw new Error(
          `Failed to update job status: AsyncJobStatus ${jobStatus.jobId} not found`,
        );
      }
      return updatedJobStatus;
    }
  }

}
