import { IsNotEmpty, IsString } from "class-validator";
import { ConnectorVariableAttributes } from "./ConnectorVariableAttributes";

/**
 * Represents the EVSE variable attributes
 * necessary to map to an OCPI Location/EVSE/Connector
 */
export class EvseVariableAttributes {
  id!: number

  @IsString()
  @IsNotEmpty()
  evseAvailabilityState!: string;

  @IsString()
  @IsNotEmpty()
  evseId!: string;

  @IsString()
  @IsNotEmpty()
  evseDcVoltage!: string;

  @IsString()
  @IsNotEmpty()
  evseDcCurrent!: string;

  @IsString()
  @IsNotEmpty()
  evsePower!: string;

  @IsString()
  @IsNotEmpty()
  private _connectorIds!: string

  get connectorIds(): number[] {
    return this._connectorIds ? this._connectorIds.split(',').map(id => Number(id)) : [];
  }

  set connectorIds(value: string) {
    this._connectorIds = value;
  }

  // not a database-derived field
  connectors: Record<number, ConnectorVariableAttributes> = {};
}

export const evseVariableAttributesQuery = (stationId: string, evseComponentId: number) => `
  select * 
  from 
    coalesce(
      (
        select string_agg(distinct e."connectorId"::text, ',') from "VariableAttributes" va 
        left join "Variables" v on va."variableId" = v."id" 
        left join "Components" c on va."componentId" = c."id"
        left join "Evses" e on c."evseDatabaseId" = e."databaseId"
        where va."stationId" = '${stationId}' and e."connectorId" is not null
      ), ''
    ) as connectorIds,
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
          left join "Evses" e on c."evseDatabaseId" = e."databaseId" 
        where va."stationId" = '${stationId}' and e."id" = ${evseComponentId} and c."name" = 'EVSE' and v."name" = 'AvailabilityState'
      ), 'Unavailable'
    ) as evseAvailabilityState,
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
          left join "Evses" e on c."evseDatabaseId" = e."databaseId" 
        where va."stationId" = '${stationId}' and e."id" = ${evseComponentId} and c."name" = 'EVSE' and v."name" = 'EvseId'
      ), 'Unknown'
    ) as evseId,
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
          left join "Evses" e on c."evseDatabaseId" = e."databaseId" 
        where va."stationId" = '${stationId}' and e."id" = ${evseComponentId} and c."name" = 'EVSE' and v."name" = 'DCVoltage'
      ), '0'
    ) as evseDcVoltage,
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
          left join "Evses" e on c."evseDatabaseId" = e."databaseId" 
        where va."stationId" = '${stationId}' and e."id" = ${evseComponentId} and c."name" = 'EVSE' and v."name" = 'DCCurrent'
      ), '0'
    ) as evseDcCurrent,
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
          left join "Evses" e on c."evseDatabaseId" = e."databaseId" 
        where va."stationId" = '${stationId}' and e."id" = 1 and c."name" = 'EVSE' and v."name" = 'Power'
      ), '0'
    ) as evsePower;
`;
