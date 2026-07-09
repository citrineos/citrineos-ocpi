Scripts for the CitrineOS OCPI server

### Gireve retry runner (CronJob entrypoint)

The Gireve broadcast retry worker runs as a **one-shot** process, separate from the OCPI HTTP server pods. Use the same Docker image as `citrineos-ocpi` with a different command.

Local / Docker (no full build required):

```bash
npm run gireve-retry
```

Production image (after `npm run build`):

```bash
npm run gireve-retry:dist
```

Kubernetes (sizopt): CronJob example — same env as the OCPI pod, `concurrencyPolicy: Forbid`, schedule aligned with `CITRINEOS_OCPI_GIREVE_RETRY_INTERVAL_SECONDS`:

```yaml
command: ["node", "Server/dist/gireve-retry/index.js"]
env:
  - name: APP_ENV
    value: docker
```

### convert_authorization_for_ocpi.ts - Converts the authorization for OCPI

This script is used to convert the authorization for OCPI escpecially change tenant + add additional info for real time auth.
how to use:

1. set environment variables : OLD_TENANT_ID, NEW_TENANT_ID
2. run the script with the following command inside the scripts folder:
   inside citrineos-ocpi folder:

```
npx tsx ./Server/scripts/convert_authorization_for_ocpi.ts
```

3. the script will convert the authorization for OCPI
4. the script will return the number of authorizations converted

### insert_authorizations_from_csv.ts - Inserts authorizations from a CSV file

this script is used to insert authorizations from a CSV file into the database
it's useful to test the other scripts with data exported as CSV from prod or staging.

how to use:

1. export the authorizations from prod or staging as CSV
2. add the CSV file to the files folder and set the CSV_FILE environment variable to the file name
3. run the script with the following command inside the scripts folder:

```
node insert_authorizations_from_csv.ts
```

4. the script will insert the authorizations into the database
5. the script will return the number of authorizations inserted

### push-all-tokens-to-partner.ts - Pushes all tokens to a partner

This script is used to push all tokens to a partner.
how to use:

1. set environment variables : OUR_COUNTRY_CODE, OUR_PARTY_ID, PARTNER_COUNTRY_CODE, PARTNER_PARTY_ID
2. run the script with the following command inside citrineos-ocpi folder:

```
 npx tsx ./Server/scripts/push-all-tokens-to-partner.ts
```
