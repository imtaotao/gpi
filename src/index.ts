import { pickManifest } from "./pickManifest";
import type { Packages, GpiOptions } from "./types";

export * from "./types";
export * from "./utils";
export { pickManifest } from "./pickManifest";

const fullDoc = "application/json";
const corgiDoc =
  "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*";

const packumentCache: Record<string, Promise<Packages>> = {};

const packument = async (
  url: string,
  customFetch: typeof fetch,
  fullMetadata = false
): Promise<Packages> => {
  const spec = `${fullMetadata}:${url}`;
  if (spec in packumentCache) {
    return packumentCache[spec];
  }
  packumentCache[spec] = customFetch(url, {
    headers: {
      accept: fullMetadata ? fullDoc : corgiDoc,
    },
  })
    .then(async (res) => {
      const packument = await res.json();
      packument._cached = res.headers.has("x-local-cache");
      packument._contentLength = Number(res.headers.get("content-length"));
      return packument;
    })
    .catch((err) => {
      delete packumentCache[spec];
      if ((err as any).code !== "E404" || fullMetadata) {
        throw err;
      }
      fullMetadata = true;
      return packument(url, customFetch, fullMetadata);
    });
  return packumentCache[spec];
};

export function gpi(pkgName: string, wanted: string, opts?: GpiOptions) {
  let {
    fullMetadata,
    customFetch = fetch,
    registry = "https://registry.npmjs.org",
  } = opts || {};
  if (!registry.endsWith("/")) registry += "/";
  return packument(`${registry}${pkgName}`, customFetch, fullMetadata).then(
    (res) => pickManifest(res, wanted, opts)
  );
}
