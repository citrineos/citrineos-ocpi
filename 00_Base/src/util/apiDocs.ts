// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';

// enexflow: twin of citrineos-core 02_Util/src/util/apiDocs.ts, keep both rules in sync.
// enexflow: APP_ENV is "local" in every cluster, so the pod namespace is the only env marker.
export const API_DOCS_NAMESPACES: ReadonlySet<string> = new Set([
  'dev',
  'staging',
]);

export const SERVICE_ACCOUNT_NAMESPACE_PATH =
  '/var/run/secrets/kubernetes.io/serviceaccount/namespace';

const readServiceAccountNamespace = (): string | undefined => {
  try {
    return fs.readFileSync(SERVICE_ACCOUNT_NAMESPACE_PATH, 'utf8').trim();
  } catch {
    return undefined;
  }
};

/** Serve Swagger UI and the OpenAPI spec only outside Kubernetes or in dev/staging. */
export function isApiDocsExposed(
  env: NodeJS.ProcessEnv = process.env,
  readNamespace: () => string | undefined = readServiceAccountNamespace,
): boolean {
  const namespace = readNamespace();
  if (namespace !== undefined) {
    return API_DOCS_NAMESPACES.has(namespace);
  }
  // In a pod without a mounted namespace we cannot tell prod apart, so stay closed.
  return !env.KUBERNETES_SERVICE_HOST;
}

/** Docs routes exempt from OCPI auth: none when docs are hidden, so no route skips auth for them. */
export function apiDocsAuthExemptRoutes(
  exposeDocs: boolean = isApiDocsExposed(),
): string[] {
  return exposeDocs ? ['/docs', '/docs/spec', '/favicon.png'] : [];
}
