import { IsBoolean, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Service } from 'typedi';
import 'reflect-metadata';
import { Optional } from '../../util/decorators/Optional';

@Service()
export class SequelizeConfig {
  @IsString()
  @IsNotEmpty()
  host: string = 'localhost';

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  port: number = 5432;

  @IsString()
  @IsNotEmpty()
  database: string = 'citrine';

  @Optional()
  dialect?: any = 'postgres';

  @IsString()
  @IsNotEmpty()
  username: string = 'citrine';

  @IsString()
  @IsNotEmpty()
  password: string = 'citrine';

  @IsString()
  @IsNotEmpty()
  storage: string = '';

  @IsBoolean()
  @Optional()
  sync?: boolean = false;

  @IsBoolean()
  @Optional()
  alter?: boolean = true;

  @IsInt()
  @Min(0)
  @Optional()
  maxRetries?: number;

  @IsInt()
  @Min(0)
  @Optional()
  retryDelay?: number;
}
