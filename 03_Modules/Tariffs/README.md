<!-- SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project -->
<!--                                                                       -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Module Tariffs OCPI 2.2.1 - Documentation technique

## Vue d'ensemble

Le module Tariffs implémente la spécification OCPI 2.2.1 pour la gestion des tarifs de recharge. Il couvre les deux interfaces définies par la norme :

- **Sender Interface (CPO)** : expose les tarifs aux partenaires via un endpoint paginé
- **Receiver Interface (eMSP)** : reçoit, consulte et supprime les tarifs poussés par un CPO

---

## Architecture

```mermaid
flowchart TD
    subgraph senderInterface ["Sender Interface (CPO)"]
        SenderGET["GET /tariffs\n(liste paginée)"]
    end
    subgraph receiverInterface ["Receiver Interface (eMSP)"]
        ReceiverGET["GET /:country_code/:party_id/:tariff_id"]
        ReceiverPUT["PUT /:country_code/:party_id/:tariff_id"]
        ReceiverDELETE["DELETE /:country_code/:party_id/:tariff_id"]
    end
    subgraph serviceLayer ["Service Layer"]
        TariffsService["TariffsService"]
    end
    subgraph graphqlLayer ["GraphQL Layer"]
        Queries["GET_TARIFFS_QUERY\nGET_TARIFF_BY_KEY_QUERY\nGET_TARIFF_BY_OCPI_ID_QUERY"]
        Mutations["CREATE_OR_UPDATE_TARIFF_MUTATION\nDELETE_TARIFF_MUTATION"]
    end
    subgraph mapperLayer ["Mapper Layer"]
        TariffMapper["TariffMapper\ncore → OCPI (map)\nOCPI → core (mapFromOcpi)"]
    end
    subgraph eventLayer ["Event / Broadcast Layer"]
        PgNotify["PG Notify\n(TariffNotification)"] --> DtoRouter["DtoRouter"]
        DtoRouter --> RabbitMQ["RabbitMQ"]
        RabbitMQ --> TariffsModule["TariffsModule\nINSERT/UPDATE/DELETE handlers"]
        TariffsModule --> TariffsBroadcaster["TariffsBroadcaster"]
        TariffsBroadcaster --> TariffsClientApi["TariffsClientApi"]
    end
    SenderGET --> TariffsService
    ReceiverGET --> TariffsService
    ReceiverPUT --> TariffsService
    ReceiverDELETE --> TariffsService
    TariffsService --> Queries
    TariffsService --> Mutations
    TariffsService --> TariffMapper
```

---

## Endpoints API

### Sender Interface (CPO)

| Méthode | Route                 | Description                                                                                  |
| ------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `GET`   | `/:versionId/tariffs` | Liste paginée de tous les tarifs du CPO. Supporte `date_from`, `date_to`, `offset`, `limit`. |

### Receiver Interface (eMSP)

| Méthode  | Route                                                    | Description                                                                                                                                                    |
| -------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/:versionId/tariffs/:country_code/:party_id/:tariff_id` | Récupère un tarif spécifique par ses identifiants OCPI. Retourne `404` si non trouvé.                                                                          |
| `PUT`    | `/:versionId/tariffs/:country_code/:party_id/:tariff_id` | Crée ou met à jour un tarif. Le body est validé par `PutTariffRequestSchema`. Les `country_code`, `party_id` et `tariff_id` de l'URL priment sur ceux du body. |
| `DELETE` | `/:versionId/tariffs/:country_code/:party_id/:tariff_id` | Supprime un tarif. Retourne une erreur si le tarif n'existe pas.                                                                                               |

---

## Fichiers et responsabilités

### Controller

**`03_Modules/Tariffs/src/module/TariffsModuleApi.ts`**

Contrôleur principal enregistré sur `/:versionId/tariffs`. Implémente `ITariffsModuleApi`. Méthodes :

- `getTariffs()` — Sender GET paginé avec `@Paginated()`, `@FunctionalEndpointParams()`
- `getTariffById()` — Receiver GET unitaire, lance `NotFoundException` si absent
- `putTariff()` — Receiver PUT, valide le body avec `@BodyWithSchema(PutTariffRequestSchema)`, délègue à `TariffsService.createOrUpdateTariff()`
- `deleteTariff()` — Receiver DELETE, délègue à `TariffsService.deleteTariff()`, retourne `OcpiEmptyResponse`

### Interface

**`03_Modules/Tariffs/src/module/ITariffsModuleApi.ts`**

Contrat TypeScript définissant les signatures de `getTariffs`, `getTariffById`, `putTariff` et `deleteTariff`.

### Service

**`00_Base/src/services/TariffsService.ts`**

Couche métier injectée via `typedi`. Méthodes :

| Méthode                                             | Description                                                                                                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getTariffByKey({ id, countryCode, partyId })`      | Lookup par clé interne (id int + tenant). Utilisé en interne et par le broadcaster.                                                                                                 |
| `getTariffByOcpiId(countryCode, partyId, tariffId)` | Lookup par identifiants OCPI (tariffId est un string parsé en int). Utilisé par les endpoints Receiver GET et DELETE.                                                               |
| `getTariffs(ocpiHeaders, paginationParams?)`        | Liste paginée avec filtres `date_from`/`date_to` sur `updatedAt`.                                                                                                                   |
| `createOrUpdateTariff(tariffRequest)`               | Upsert via `CREATE_OR_UPDATE_TARIFF_MUTATION`. Convertit le DTO OCPI en modèle core via `TariffMapper.mapFromOcpi()`, puis reconvertit le résultat en DTO via `TariffMapper.map()`. |
| `deleteTariff(countryCode, partyId, tariffId)`      | Vérifie l'existence du tarif puis le supprime via `DELETE_TARIFF_MUTATION`. Lance une erreur si non trouvé.                                                                         |

### Mapper

**`00_Base/src/mapper/TariffMapper.ts`**

Classe statique de conversion bidirectionnelle :

| Méthode                             | Direction             | Description                                                                                                                                                                        |
| ----------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `map(coreTariff)`                   | Core → OCPI           | Convertit un `TariffDto` interne en `TariffDTO` OCPI. Construit les `TariffElement` à partir de `pricePerKwh`, `pricePerMin`, `pricePerSession`. Mappe `tariffAltText` si présent. |
| `mapElementsToCoreTariff(elements)` | OCPI → Core (partiel) | Extrait `pricePerKwh`, `pricePerMin`, `pricePerSession`, `taxRate` depuis les `PriceComponent` d'un `TariffElement`.                                                               |
| `mapFromOcpi(tariff)`               | OCPI → Core           | Conversion complète d'un `PutTariffRequest` OCPI en `Partial<TariffDto>` core. Combine `mapElementsToCoreTariff` avec les champs `id`, `currency`, `tariffAltText`.                |

### GraphQL

**`00_Base/src/graphql/queries/tariff.queries.ts`**

| Constante                          | Type     | Description                                                                          |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `GET_TARIFF_BY_KEY_QUERY`          | Query    | Lookup par `id` (int) + tenant `countryCode`/`partyId`.                              |
| `GET_TARIFFS_QUERY`                | Query    | Liste paginée avec filtre `where` sur `updatedAt` et tenant.                         |
| `GET_TARIFF_BY_OCPI_ID_QUERY`      | Query    | Lookup par `tariffId` (int) + tenant. Utilisé par les endpoints Receiver.            |
| `CREATE_OR_UPDATE_TARIFF_MUTATION` | Mutation | Upsert avec `on_conflict` sur `Tariffs_pkey`. Met à jour tous les champs de pricing. |
| `DELETE_TARIFF_MUTATION`           | Mutation | Suppression par `id` (clé primaire).                                                 |

**`00_Base/src/graphql/operations.ts`**

Types TypeScript correspondants : `CreateOrUpdateTariffMutationResult/Variables`, `DeleteTariffMutationResult/Variables`, `GetTariffByOcpiIdQueryResult/Variables`.

### Broadcaster

**`00_Base/src/broadcaster/TariffsBroadcaster.ts`**

Diffuse les changements de tarifs vers les partenaires via `TariffsClientApi` :

- `broadcastPutTariff(tenant, tariffDto)` — Récupère les champs manquants (`currency`, `pricePerKwh`) via GraphQL si besoin, mappe en OCPI, puis envoie un PUT à tous les partenaires Receiver.
- `broadcastTariffDeletion(tenant, tariffDto)` — Envoie un DELETE à tous les partenaires Receiver.

### Event Handlers

**`03_Modules/Tariffs/src/index.ts`**

Le module `TariffsModule` écoute les notifications PostgreSQL `TariffNotification` via RabbitMQ et déclenche automatiquement les broadcasts :

| Event    | Handler              | Action                            |
| -------- | -------------------- | --------------------------------- |
| `INSERT` | `handleTariffInsert` | Appelle `broadcastPutTariff`      |
| `UPDATE` | `handleTariffUpdate` | Appelle `broadcastPutTariff`      |
| `DELETE` | `handleTariffDelete` | Appelle `broadcastTariffDeletion` |

### Client API

**`00_Base/src/trigger/TariffsClientApi.ts`**

Client HTTP sortant pour appeler les endpoints OCPI Tariffs des partenaires :

- `getTariff(countryCode, partyId, tariffId)` — GET sur le Receiver partenaire
- `putTariff(countryCode, partyId, tariffId, tariff)` — PUT sur le Receiver partenaire
- `deleteTariff(countryCode, partyId, tariffId)` — DELETE sur le Receiver partenaire

### Modèles de données

| Fichier                                             | Description                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `00_Base/src/model/Tariff.ts`                       | Schéma Zod `TariffSchema` complet OCPI (id, country_code, party_id, currency, type, elements, etc.) |
| `00_Base/src/model/DTO/tariffs/TariffDTO.ts`        | DTO de sortie avec `last_updated`. Schéma paginé `PaginatedTariffResponseSchema`.                   |
| `00_Base/src/model/DTO/tariffs/PutTariffRequest.ts` | DTO d'entrée pour le PUT (sans `last_updated`).                                                     |
| `00_Base/src/model/TariffElement.ts`                | `TariffElementSchema` : `price_components` + `restrictions`                                         |
| `00_Base/src/model/TariffRestrictions.ts`           | Restrictions horaires, jour, kWh, durée, puissance                                                  |
| `00_Base/src/model/TariffDimensionType.ts`          | Enum : `ENERGY`, `FLAT`, `PARKING_TIME`, `TIME`                                                     |
| `00_Base/src/model/TariffType.ts`                   | Enum : `AD_HOC_PAYMENT`, `PROFILE_CHEAP`, `PROFILE_FAST`, `PROFILE_GREEN`, `REGULAR`                |

---

## Tests

### Lancer les tests

```bash
nvm use 20
npx jest --config jest.config.cjs --testPathPattern="Tariff"
```

### Fichiers de test

| Fichier                                                 | Couverture                                                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `00_Base/src/mapper/__tests__/TariffMapper.test.ts`     | `map()` (core→OCPI), `mapElementsToCoreTariff()`, `mapFromOcpi()` (OCPI→core), round-trip                                           |
| `00_Base/src/services/__tests__/TariffsService.test.ts` | `getTariffByKey`, `getTariffByOcpiId`, `getTariffs` (avec filtres dates), `createOrUpdateTariff`, `deleteTariff` (succès + erreurs) |

### Configuration Jest

`jest.config.cjs` :

- `setupFiles: ['reflect-metadata']` — requis pour les décorateurs
- `moduleNameMapper: { '\.js$' → '' }` — redirige les imports ESM `.js` vers les `.ts`
- `transformIgnorePatterns` — transforme `@citrineos/*` (packages ESM dans node_modules)
- Override tsconfig : `verbatimModuleSyntax: false`, `module: commonjs`

---

## Flux de données

### Pull model (eMSP interroge le CPO)

```
eMSP  →  GET /tariffs?date_from=...&limit=50  →  CPO
eMSP  ←  PaginatedTariffResponse { data: TariffDTO[], total, offset, limit }
```

### Push model (CPO pousse vers l'eMSP)

```
[DB] INSERT/UPDATE Tariffs  →  PG NOTIFY TariffNotification
                            →  DtoRouter → RabbitMQ
                            →  TariffsModule.handleTariffInsert/Update
                            →  TariffsBroadcaster.broadcastPutTariff
                            →  TariffsClientApi.putTariff  →  eMSP PUT /:cc/:pid/:tid
```

```
[DB] DELETE Tariffs  →  PG NOTIFY TariffNotification
                     →  DtoRouter → RabbitMQ
                     →  TariffsModule.handleTariffDelete
                     →  TariffsBroadcaster.broadcastTariffDeletion
                     →  TariffsClientApi.deleteTariff  →  eMSP DELETE /:cc/:pid/:tid
```

### Receiver (eMSP reçoit du CPO)

```
CPO  →  PUT /:versionId/tariffs/:cc/:pid/:tid  →  TariffsModuleApi.putTariff
     →  TariffsService.createOrUpdateTariff
     →  TariffMapper.mapFromOcpi → GraphQL upsert → TariffMapper.map
     →  OcpiResponse { data: TariffDTO }
```

```
CPO  →  DELETE /:versionId/tariffs/:cc/:pid/:tid  →  TariffsModuleApi.deleteTariff
     →  TariffsService.deleteTariff
     →  GraphQL delete
     →  OcpiEmptyResponse
```
