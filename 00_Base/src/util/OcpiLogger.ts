import { Service } from 'typedi';
import { ILogObj, Logger } from 'tslog';
import { ServerConfig } from '../config/ServerConfig';
import { Env } from '../config/sub/Env';

@Service()
export class OcpiLogger extends Logger<ILogObj> {
  constructor(serverConfig: ServerConfig) {
    super({
      name: 'CitrineOS Ocpi Logger',
      minLevel: serverConfig.logLevel,
      hideLogPositionForProduction: serverConfig.env === Env.PRODUCTION,
      // Disable colors for cloud deployment as some cloud logging environments such as cloudwatch can not interpret colors
      stylePrettyLogs: serverConfig.env !== Env.DEVELOPMENT,
    });
  }
}
