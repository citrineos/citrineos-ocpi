import { IsNotEmpty, IsString } from 'class-validator';
import { Service } from 'typedi';
import 'reflect-metadata';

@Service()
export class ServerConfigUtilGraphQL {
  @IsString()
  @IsNotEmpty()
  url: string;

  constructor() {
    this.url = 'http://localhost:8090/v1/graphql';
  }
}
