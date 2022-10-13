import { pickManifest } from "./pickManifest";

const registry = "https://registry.npmjs.org/";
const corgiDoc =
  "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*";
const fullDoc = "application/json";

const packumentCache = new Map<string, any>();
async function packument(
  packumentUrl: string,
  fullMetadata = false
): Promise<any> {
  if (packumentCache && packumentCache.has(packumentUrl)) {
    return packumentCache.get(packumentUrl);
  }
  try {
    const res = await fetch(packumentUrl, {
      headers: {
        accept: fullMetadata ? fullDoc : corgiDoc,
      },
    });
    const packument = await res.json();
    packument._cached = res.headers.has("x-local-cache");
    packument._contentLength = +(res.headers.get("content-length") as any);
    if (packumentCache) {
      packumentCache.set(packumentUrl, packument);
    }
    return packument;
  } catch (err) {
    if (packumentCache) {
      packumentCache.delete(packumentUrl);
    }
    if ((err as any).code !== "E404" || fullMetadata) {
      throw err;
    }
    fullMetadata = true;
    return packument(packumentUrl, fullMetadata);
  }
}

export async function getLockJson(deps: Record<string, string>) {
  const ls = [];
  for (const pkgName in deps) {
    const spec = deps[pkgName];
    const p = packument(`${registry}${pkgName}`).then((res) => {
      return pickManifest(res, spec, { defaultTag: "latest" });
    });
    ls.push(p);
  }
  const res = await Promise.all(ls);
  console.log(res[0]);
}
