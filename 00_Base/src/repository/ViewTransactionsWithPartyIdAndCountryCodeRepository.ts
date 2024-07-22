import { SequelizeRepository } from '@citrineos/data';
import { SystemConfig } from '@citrineos/base';
import { Service } from 'typedi';
import { OcpiServerConfig } from '../config/ocpi.server.config';
import { ILogObj, Logger } from 'tslog';
import { OcpiSequelizeInstance } from '../util/sequelize';
import { OcpiNamespace } from '../util/ocpi.namespace';
import { ViewTransactionsWithPartyIdAndCountryCode } from '../model/view/ViewTransactionsWithPartyIdAndCountryCode';

@Service()
export class ViewTransactionsWithPartyIdAndCountryCodeRepository extends SequelizeRepository<ViewTransactionsWithPartyIdAndCountryCode> {
  constructor(
    ocpiSystemConfig: OcpiServerConfig,
    logger: Logger<ILogObj>,
    ocpiSequelizeInstance: OcpiSequelizeInstance,
  ) {
    super(
      ocpiSystemConfig as SystemConfig,
      OcpiNamespace.TransactionsWithPartyIdAndCountryCode,
      logger,
      ocpiSequelizeInstance.sequelize,
    );
  }
}
