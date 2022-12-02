import { createDefer } from "./utils";
import { pickManifest } from "./pickManifest";
import type { Packages, GpiOptions, RetryType } from "./types";

export * from "./types";
export * from "./utils";
export { pickManifest } from "./pickManifest";

const fullDoc = "application/json";
// prettier-ignore
const corgiDoc = "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*";
const packumentCache: Record<string, Promise<Packages>> = {};

const packument = (
  url: string,
  pkgName: string,
  customFetch: typeof fetch,
  retry?: RetryType,
  fullMetadata = false
): Promise<Packages> => {
  const spec = `${fullMetadata}:${url}`;
  if (spec in packumentCache) {
    return packumentCache[spec];
  }

  let retryTimes = 0;

  const request = () => {
    const p = customFetch(url, {
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
      .catch(async (err) => {
        delete packumentCache[spec];
        if ((err as any).code !== "E404" || fullMetadata) {
          if (retry) {
            const defer = createDefer();
            retry(pkgName, ++retryTimes, () => {
              request().then(defer.resolve, defer.reject);
            });
            await defer.p;
          }
          throw err;
        } else {
          fullMetadata = true;
          return packument(url, pkgName, customFetch, retry, fullMetadata);
        }
      });
    packumentCache[spec] = p;
    return p;
  };
  return request();
};

export function gpi(pkgName: string, wanted: string, opts?: GpiOptions) {
  let {
    retry,
    fullMetadata,
    customFetch = fetch,
    registry = "https://registry.npmjs.org",
  } = opts || {};
  if (!registry.endsWith("/")) registry += "/";
  return packument(
    `${registry}${pkgName}`,
    pkgName,
    customFetch,
    retry,
    fullMetadata
  ).then((res) => pickManifest(res, wanted, opts));
}
