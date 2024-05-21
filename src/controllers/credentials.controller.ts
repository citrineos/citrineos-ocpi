import {Body, Controller, Delete, Get, HeaderParam, Post, Put, UseAfter} from "routing-controllers";
import {OcpiModules} from "../apis/BaseApi";
import {BaseController} from "./base.controller";
import {Credentials, CredentialsResponse} from "../model/Credentials";
import {ResponseSchema} from "../util/openapi";
import {HttpHeader, HttpStatus} from "@citrineos/base";
import {OcpiEmptyResponse} from "../util/ocpi.empty.response";
import {CredentialsService} from "../service/credentials.service";
import {VersionNumber} from "../model/VersionNumber";
import {VersionNumberParam} from "../util/decorators/version.number.param";
import {Service} from "typedi";

@Controller(`/${OcpiModules.Credentials}`)
@Service()
export class CredentialsController extends BaseController {

  constructor(readonly credentialsService: CredentialsService) {
    super();
  }

  @Get()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async getCredentials(
    @HeaderParam(HttpHeader.Authorization) token: string
  ): Promise<CredentialsResponse> {
    return this.credentialsService?.getCredentials(token);
  }

  @Post()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async postCredentials(
    @HeaderParam(HttpHeader.Authorization) token: string,
    @Body() credentials: Credentials,
    @VersionNumberParam() version: VersionNumber
  ): Promise<CredentialsResponse> {
    return this.credentialsService?.postCredentials(token, credentials, version);
  }

  @Put()
  @ResponseSchema(CredentialsResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async putCredentials(
    @HeaderParam(HttpHeader.Authorization) token: string,
    @Body() credentials: Credentials,
    @VersionNumberParam() version: VersionNumber
  ): Promise<CredentialsResponse> {
    return this.credentialsService?.putCredentials(token, credentials, version);
  }

  @Delete()
  @ResponseSchema(OcpiEmptyResponse, {
    statusCode: HttpStatus.OK,
    description: 'Successful response',
  })
  async deleteCredentials(
    @HeaderParam(HttpHeader.Authorization) token: string,
  ): Promise<OcpiEmptyResponse> {
    return this.credentialsService?.deleteCredentials(token);
  }
}
