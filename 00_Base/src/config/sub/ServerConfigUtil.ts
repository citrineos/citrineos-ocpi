import { IsNotEmpty, Validate, ValidateNested } from 'class-validator';
import { Service } from 'typedi';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { ServerConfigUtilCache } from './ServerConfigUtilCache';
import { ServerConfigUtilMessageBroker } from './ServerConfigUtilMessageBroker';
import { Optional } from '../../util/decorators/Optional';
import { ServerConfigUtilSwagger } from './ServerConfigUtilSwagger';
import { ServerConfigUtilDirectus } from './ServerConfigUtilDirectus';
import { ServerConfigUtilNetworkConnection } from './ServerConfigUtilNetworkConnection';
import { ServerConfigUtilCertificateAuthority } from './ServerConfigUtilCertificateAuthority';

@Service()
export class ServerConfigUtil {
  @IsNotEmpty()
  @Type(() => ServerConfigUtilCache)
  @ValidateNested()
  @Validate((obj: ServerConfigUtilCache) => obj.memory || obj.redis, {
    message: 'A cache implementation must be set',
  })
  cache: ServerConfigUtilCache = new ServerConfigUtilCache();

  @IsNotEmpty()
  @Type(() => ServerConfigUtilMessageBroker)
  @ValidateNested()
  @Validate(
    (obj: ServerConfigUtilMessageBroker) => obj.pubsub || obj.kafka || obj.amqp,
    {
      message: 'A message broker implementation must be set',
    },
  )
  messageBroker: ServerConfigUtilMessageBroker =
    new ServerConfigUtilMessageBroker();

  @Optional()
  @Type(() => ServerConfigUtilSwagger)
  @ValidateNested()
  swagger?: ServerConfigUtilSwagger = new ServerConfigUtilSwagger();

  @Optional()
  @Type(() => ServerConfigUtilDirectus)
  @ValidateNested()
  directus?: ServerConfigUtilDirectus = new ServerConfigUtilDirectus();

  @IsNotEmpty()
  @Type(() => ServerConfigUtilNetworkConnection)
  @ValidateNested()
  networkConnection: ServerConfigUtilNetworkConnection =
    new ServerConfigUtilNetworkConnection();

  @IsNotEmpty()
  @Type(() => ServerConfigUtilCertificateAuthority)
  @ValidateNested()
  certificateAuthority: ServerConfigUtilCertificateAuthority =
    new ServerConfigUtilCertificateAuthority();
}
