import {v4 as uuidv4} from 'uuid';
import {
  ClientCredentialsRole,
  ClientInformation,
  ClientInformationRepository,
  ClientVersion,
  CredentialsDTO,
  Endpoint,
  EndpointDTO,
  invalidClientCredentialsRoles,
  OcpiLogger,
  OcpiNamespace,
  VersionNumber,
  VersionsClientApi
} from '@citrineos/ocpi-base';
import {Service} from 'typedi';
import {BadRequestError, InternalServerError, NotFoundError} from "routing-controllers";
import {BusinessDetails} from "@citrineos/ocpi-base/dist/model/BusinessDetails";
import {Image} from "@citrineos/ocpi-base/dist/model/Image";

@Service()
export class CredentialsService {
  constructor(
    private logger: OcpiLogger,
    private clientInformationRepository: ClientInformationRepository,
    private versionsClientApi: VersionsClientApi,
  ) {
  }

  async getClientInformation(token: string): Promise<ClientInformation> {
    const clientInformationResponse = await this.clientInformationRepository.readOnlyOneByQuery(
      {
        where: {
          clientToken: token,
        },
        include: [
          {
            model: ClientCredentialsRole,
            include: [
              {
                model: BusinessDetails,
                include: [
                  Image
                ]
              }
            ]
          },
          {
            model: ClientVersion,
            include: [
              Endpoint
            ]
          }
        ]
      },
      OcpiNamespace.Credentials,
    );
    if (!clientInformationResponse) {
      this.logger.debug('Client information not found for token', token);
      throw new NotFoundError('Credentials not found');
    }
    return clientInformationResponse;
  }

  async postCredentials(
    token: string,
    credentials: CredentialsDTO,
    version: VersionNumber,
  ): Promise<ClientInformation> {
    let clientInformation = await this.getClientInformation(token);
    const freshVersionDetails = await this.getClientVersionDetails(clientInformation, version, credentials);
    const newToken = uuidv4();
    const clientInformationList = await this.clientInformationRepository.updateAllByQuery({
      serverToken: newToken,
      registered: true,
      clientVersionDetails: [
        ...clientInformation.clientVersionDetails.filter(
          (versionDetails: ClientVersion) => versionDetails.version !== version
        ),
        freshVersionDetails
      ]
    }, {
      where: {
        clientToken: token
      }
    });
    if (clientInformationList) { // todo use update one by query which should return one item
      clientInformation = clientInformationList[0];
      if (clientInformation) {
        return clientInformation;
      }
    }
    // todo error handling
    throw new InternalServerError('Could not update client information');
  }

  async putCredentials(
    token: string,
    credentials: CredentialsDTO,
    version: VersionNumber,
  ): Promise<ClientInformation> {
    const clientInformation = await this.getClientInformation(token);
    const versionDetails = await this.getClientVersionDetails(clientInformation, version, credentials);
    return await this.updateCredentials(clientInformation, token, credentials, versionDetails);
  }

  async deleteCredentials(token: string): Promise<void> {
    try {
      // todo, is it okay to delete ClientInformation?
      await this.clientInformationRepository.deleteAllByQuery({
          where: {
            clientToken: token,
          },
        },
        OcpiNamespace.Credentials,
      );
      return;
    } catch (e) {
      throw new Error('todo'); // todo error handling
    }
  }

  private async updateCredentials(
    clientInformation: ClientInformation,
    token: string,
    credentials: CredentialsDTO,
    freshVersionDetails: ClientVersion,
  ) {
    if (invalidClientCredentialsRoles(credentials.roles)) {
      throw new BadRequestError('Invalid client credentials roles, must be EMSP');
    }
    const clientInformationList = await this.clientInformationRepository.updateAllByQuery({ // todo need to use update one by query so that one item is returned
        clientCredentialsRoles: credentials.roles as ClientCredentialsRole[],
        clientVersionDetails: [
          ...clientInformation.clientVersionDetails.filter((versionDetails: ClientVersion) => versionDetails.version !== freshVersionDetails.version),
          freshVersionDetails
        ]
      }, {
        where: {
          clientToken: token,
        },
      },
      OcpiNamespace.Credentials,
    );
    return clientInformationList[0];
  }

  private async getClientVersionDetails(
    clientInformation: ClientInformation,
    versionNumber: VersionNumber,
    credentials: CredentialsDTO,
  ): Promise<ClientVersion> {
    const existingVersionDetails = clientInformation.clientVersionDetails.map((result: ClientVersion) => result.dataValues).find((v: ClientVersion) => v.version === versionNumber);
    if (!existingVersionDetails) {
      throw new NotFoundError('Version details not found');
    }
    this.versionsClientApi.baseUrl = existingVersionDetails.url;
    const versions = await this.versionsClientApi.getVersions({
      version: versionNumber,
      authorization: credentials.token,
    });
    if (!versions || !versions.data) {
      throw new NotFoundError('Versions not found');
    }
    const version = versions.data?.find(
      (v: any) => v.version === versionNumber,
    );
    if (!version) {
      throw new NotFoundError('Matching version not found');
    }
    const versionDetails = await this.versionsClientApi.getVersion({
      authorization: credentials.token,
      version: versionNumber,
    });
    if (!versionDetails) { // todo check for successful status globally
      throw new NotFoundError('Matching version details not found');
    }
    const endpoints = versionDetails.data?.endpoints.map((endpoint: EndpointDTO) => Endpoint.buildEndpoint(
      endpoint.identifier,
      endpoint.role,
      endpoint.url
    ));
    return ClientVersion.buildClientVersion(versionNumber, version.url, endpoints!);
  }
}