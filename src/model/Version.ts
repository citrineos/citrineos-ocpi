import {VersionNumber} from './VersionNumber';
import {ArrayMinSize, IsArray, IsNotEmpty, IsObject, IsString, IsUrl, ValidateNested,} from 'class-validator';
import {Column, DataType, HasMany, Model, Table} from 'sequelize-typescript';
import {Endpoint, EndpointDTO} from './Endpoint';
import {Enum} from '../util/decorators/enum';
import {OcpiNamespace} from '../util/ocpi.namespace';
import {OcpiResponse, OcpiResponseStatusCode} from './ocpi.response';
import {Type} from 'class-transformer';

export class VersionDTO {
    @IsNotEmpty()
    @Enum(VersionNumber, 'VersionNumber')
    version!: VersionNumber;

    @IsString()
    @IsUrl()
    url!: string;
}

export class VersionDTOListResponse extends OcpiResponse<VersionDTO[]> {
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => VersionDTO)
    data!: VersionDTO[];

    static build(statusCode: OcpiResponseStatusCode, data: VersionDTO[], status_message?: string): VersionDTOListResponse {
        const response = new VersionDTOListResponse();
        response.status_code = statusCode;
        response.status_message = status_message;
        response.data = data;
        response.timestamp = new Date();
        return response;
    }
}

export class VersionDetailsDTO {
    @IsNotEmpty()
    @Enum(VersionNumber, 'VersionNumber')
    version!: VersionNumber;

    @IsArray()
    @ArrayMinSize(1)
    @IsNotEmpty()
    @Type(() => Endpoint)
    endpoints!: EndpointDTO[];

}

export class VersionDetailsDTOResponse extends OcpiResponse<VersionDetailsDTO> {
    @IsObject()
    @IsNotEmpty()
    @Type(() => VersionDetailsDTO)
    @ValidateNested()
    data!: VersionDetailsDTO;

    static build(statusCode: OcpiResponseStatusCode, data: VersionDetailsDTO, status_message?: string): VersionDetailsDTOResponse {
        const response = new VersionDetailsDTOResponse();
        response.status_code = statusCode;
        response.status_message = status_message;
        response.data = data;
        response.timestamp = new Date();
        return response;
    }
}

@Table
export class Version extends Model {
    static readonly MODEL_NAME: string = OcpiNamespace.Version;

    @Column({
        type: DataType.STRING,
        unique: 'version_number_type',
        primaryKey: true,
    })
    @IsNotEmpty()
    @Enum(VersionNumber, 'VersionNumber')
    declare version: VersionNumber;

    @Column(DataType.STRING)
    @IsString()
    @IsUrl()
    declare url: string;

    @HasMany(() => Endpoint)
    endpoints!: Endpoint[];

    public toVersionDTO(): VersionDTO {
        const dto = new VersionDTO();
        dto.version = this.version;
        dto.url = this.url;
        return dto;
    }

    public toVersionDetailsDTO(): VersionDetailsDTO {
        const dto = new VersionDetailsDTO();
        dto.version = this.version;
        dto.endpoints = this.endpoints.map((endpoint) => endpoint.toEndpointDTO());
        return dto;
    }
}
