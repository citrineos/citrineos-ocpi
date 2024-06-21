import { IsNotEmpty, IsString } from "class-validator";

/**
 * Represents the Connector variable attributes
 * necessary to map to an OCPI Location/EVSE/Connector
 */
export class ConnectorVariableAttributes {
  id!: number;

  @IsString()
  @IsNotEmpty()
  connectorType!: string;

  @IsString()
  @IsNotEmpty()
  connectorAvailabilityState!: string;
}

export const connectorVariableAttributesQuery = (stationId: string, evseComponentId: number, connectorId: number) => `
  select * 
  from
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
          left join "Evses" e on c."evseDatabaseId" = e."databaseId" 
        where va."stationId" = '${stationId}' and e."id" = ${evseComponentId} and e."connectorId" = ${connectorId} and c."name" = 'Connector' and v."name" = 'ConnectorType'
      ), 'Unknown'
    ) as connectorType,
    coalesce(
      (
        select va."value" 
        from "VariableAttributes" va 
          left join "Variables" v on va."variableId" = v."id" 
          left join "Components" c on va."componentId" = c."id"
          left join "Evses" e on c."evseDatabaseId" = e."databaseId" 
        where va."stationId" = 'CHARGER02' and e."id" = ${evseComponentId} and e."connectorId" = ${connectorId} and c."name" = 'Connector' and v."name" = 'AvailabilityState'
      ), 'Unavailable'
    ) as connectorAvailabilityState;
`;
