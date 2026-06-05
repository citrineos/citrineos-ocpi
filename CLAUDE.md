# CLAUDE.md — citrineos-ocpi (fork enexflow)

> **Fork enexflow** : support **OCPI** au-dessus de CitrineOS core. Garde les changements **upstream-friendly** ; cette gouvernance Claude est propre à enexflow.

## Stack

- **TypeScript**, **npm workspaces** (pas pnpm). Modules OCPI : `03_Modules/{Locations,Sessions,Cdrs,Tokens,Tariffs,Commands,Credentials,Versions,ChargingProfiles,Certificates,DtoRouter}`, `Server`, `00_Base`.
- Intègre **Hasura** (`npm run hasura:reload-metadata`), **codegen** (`npm run generate`), seed (`init-db` / `seed-db` / `clean-db`), mock EMSP (`start-mock-emsp`, `start-mockoon`).

## Règles

- **Discipline de fork** : changements rebasables upstream ; isole les specifics enexflow.
- **Conformité OCPI** : un champ optionnel ajouté = additif ; rendre un champ mandatory / changer un type / retirer un champ = **breaking** pour les partenaires → le signaler.
- **Gate avant PR** : `npm run lint` + `npm run test` (+ `prettier` ; `npm run generate` si le codegen est concerné). Build : `npm run build`.
- **Branches/PR** : base `env/staging`, conventional **ASCII**, ne pas merger soi-même.
- ⚠️ Les **données de roaming** (Sessions/CDRs/Tokens) vivent ici (CitrineOS), **pas** dans le Postgres de sizopt (cf. ADR-0004 côté sizopt).

## Cross-repo

Travaillé depuis **sizopt** via `--add-dir` (voir sizopt `docs/ai/CROSS_REPO.md`). Testable via le profil docker `citrine` + simulateur `mont_blanc`.
