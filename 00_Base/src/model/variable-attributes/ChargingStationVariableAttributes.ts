import { IsNotEmpty, IsString } from "class-validator";
import { EvseVariableAttributes } from "./EvseVariableAttributes";

/**
 * Represents the Charging Station variable attributes
 * necessary to map to an OCPI Location/EVSE/Connector.
 *
 * Properties are in snake_case to ensure SQL properties are properly mapped,
 * as CamelCase does register.
 */
export class ChargingStationVariableAttributes {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  authorize_remote_start!: string;

  @IsString()
  @IsNotEmpty()
  bay_occupancy_sensor_active!: string;

  @IsString()
  @IsNotEmpty()
  token_reader_enabled!: string;

  @IsString()
  @IsNotEmpty()
  evse_ids_string!: string

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
    ) as evse_ids_string,
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
        where va."stationId" = '${stationId}' and c."name" = 'AuthCtrlr' and v."name" = 'AuthorizeRemoteStart'
      ), 'FALSE'
    ) as authorize_remote_start,
    coalesce(
    (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
        where va."stationId" = '${stationId}' and c."name" = 'BayOccupancySensor' and v."name" = 'Active'
      ), 'FALSE'
    ) as bay_occupancy_sensor_active,
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
        where va."stationId" = '${stationId}' and c."name" = 'TokenReader' and v."name" = 'Enabled'
      ), 'FALSE'
    ) as token_reader_enabled;
`;
