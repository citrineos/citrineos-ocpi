import {Body, Controller, Delete, Get, Post, Put} from "routing-controllers";
import {OcpiModules} from "../apis/BaseApi";
import {BaseController} from "./base.controller";
import {Credentials, CredentialsResponse} from "../model/Credentials";
import {ResponseSchema} from "../util/openapi";
import {HttpStatus} from "@citrineos/base";
import {OcpiEmptyResponse} from "../util/ocpi.empty.response";
import {CredentialsService} from "../modules/temp/service/credentials.service";

@Controller(`/${OcpiModules.Credentials}`)
export class CredentialsController extends BaseController {

  constructor(readonly credentialsService: CredentialsService) {
    super();
  }

  @Get()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getCredentials(): Promise<CredentialsResponse> {
    return this.credentialsService?.getCredentials({} as any) as any; // todo
  }

  @Post()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async postCredentials(
    @Body() _credentials: Credentials
  ): Promise<CredentialsResponse> {
    return this.generateMockOcpiResponse(CredentialsResponse);
  }

  @Put()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async putCredentials(
    @Body() _credentials: Credentials
  ): Promise<CredentialsResponse> {
    return this.generateMockOcpiResponse(CredentialsResponse);
  }

  @Delete()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async deleteCredentials(): Promise<OcpiEmptyResponse> {
    return this.generateMockOcpiResponse(OcpiEmptyResponse);
  }
}
