import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import 'reflect-metadata';

export class ServerConfigUtilSwagger {
  @IsString()
  @IsNotEmpty()
  path!: string;

  @IsString()
  @IsNotEmpty()
  logoPath!: string;

  @IsBoolean()
  @IsNotEmpty()
  exposeData!: boolean;

  @IsBoolean()
  @IsNotEmpty()
  exposeMessage!: boolean;
}
