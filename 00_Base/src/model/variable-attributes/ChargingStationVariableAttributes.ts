import { IsNotEmpty, IsString } from "class-validator";
import { EvseVariableAttributes } from "./EvseVariableAttributes";

/**
 * Represents the Charging Station variable attributes
 * necessary to map to an OCPI Location/EVSE/Connector
 */
export class ChargingStationVariableAttributes {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  authorizeRemoteStart!: string;

  @IsString()
  @IsNotEmpty()
  bayOccupancySensorActive!: string;

  @IsString()
  @IsNotEmpty()
  tokenReaderEnabled!: string;

  @IsString()
  @IsNotEmpty()
  private _evseIds!: string

  get evseIds(): number[] {
    return this._evseIds ? this._evseIds.split(',').map(id => Number(id)) : [];
  }

  set evseIds(value: string) {
    this._evseIds = value;
  }

  // not a database-derived field
  evses: Record<number, EvseVariableAttributes> = {};
}

export const chargingStationVariableAttributesQuery = (stationId: string) => `
  select * 
  from 
    coalesce(
      (
        select string_agg(distinct e.id::text, ',') 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
          left join "Evses" e on c."evseDatabaseId" = e."databaseId"
        where va."stationId" = '${stationId}' and e."id" is not null
      ), ''
    ) as evseIds,
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
        where va."stationId" = '${stationId}' and c."name" = 'AuthCtrlr' and v."name" = 'AuthorizeRemoteStart'
      ), 'FALSE'
    ) as authorizeRemoteStart,
    coalesce(
    (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
        where va."stationId" = '${stationId}' and c."name" = 'BayOccupancySensor' and v."name" = 'Active'
      ), 'FALSE'
    ) as bayOccupancySensorActive,
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
        where va."stationId" = '${stationId}' and c."name" = 'TokenReader' and v."name" = 'Enabled'
      ), 'FALSE'
    ) as tokenReader;
`;
