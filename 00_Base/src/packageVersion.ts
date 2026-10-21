// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';

// Isolated so jest (ts-jest forces CJS, which rejects import.meta) can map it to a stub.
// Resolves to the workspace root package.json from both src/ and dist/.
export const packageVersion: string = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
).version;
