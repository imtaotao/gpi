import * as semver from "esm-semver";
import { getVersionInfo } from "./utils";
import type { Packages, DetailPackage, PickManifestOptions } from "./types";

const isBefore = (
  verTimes: Record<string, string> | undefined,
  ver: string | null,
  time: string | number | Date
) => {
  return (
    !verTimes ||
    !verTimes[ver as any] ||
    Date.parse(verTimes[ver as any]) <= time
  );
};

const avoidSemverOpt = { includePrerelease: true, loose: true };
const shouldAvoid = (ver: string, avoid?: string | null) => {
  return avoid && semver.satisfies(ver, avoid, avoidSemverOpt);
};

const decorateAvoid = (result: DetailPackage | null, avoid?: string | null) => {
  return result && shouldAvoid(result.version, avoid)
    ? { ...result, _shouldAvoid: true }
    : result;
};

const engineOk = (
  target: DetailPackage,
  npmVer: string | null,
  nodeVer: string | null,
  force = false
) => {
  const nodev = force ? null : nodeVer;
  const eng = target.engines;
  const opt = { includePrerelease: true };
  if (!eng) {
    return true;
  }

  const nodeFail = nodev && eng.node && !semver.satisfies(nodev, eng.node, opt);
  const npmFail = npmVer && eng.npm && !semver.satisfies(npmVer, eng.npm, opt);
  if (nodeFail || npmFail) {
    return false;
  }
  return true;
};

const pink = (
  packument: Packages,
  wanted: string,
  opts: PickManifestOptions
): DetailPackage | null => {
  const {
    defaultTag = "latest",
    before = null,
    nodeVersion = null,
    npmVersion = null,
    includeStaged = false,
    avoid = null,
  } = opts;

  const { name, time: verTimes } = packument;
  const versions = packument.versions || {};

  const staged =
    (includeStaged &&
      packument.stagedVersions &&
      packument.stagedVersions.versions) ||
    {};
  const restricted =
    (packument.policyRestrictions && packument.policyRestrictions.versions) ||
    {};

  const time = before && verTimes ? +new Date(before) : Infinity;
  const spec = getVersionInfo(wanted || defaultTag);
  const type = spec.type;
  const distTags = packument["dist-tags"] || {};

  if (type !== "tag" && type !== "version" && type !== "range") {
    throw new Error("Only tag, version, and range are supported");
  }

  if (wanted && type === "tag") {
    const ver = (distTags as any)[wanted];
    if (isBefore(verTimes, ver, time)) {
      return decorateAvoid(
        versions[ver] || staged[ver] || restricted[ver],
        avoid
      );
    } else {
      return pink(packument, `<=${ver}`, opts);
    }
  }

  if (wanted && type === "version") {
    const ver = semver.clean(wanted, { loose: true });
    const mani =
      versions[ver as any] || staged[ver as any] || restricted[ver as any];
    return isBefore(verTimes, ver, time) ? decorateAvoid(mani, avoid) : null;
  }

  const range = type === "range" ? wanted : "*";
  const defaultVer = (distTags as any)[defaultTag];
  if (
    defaultVer &&
    (range === "*" || semver.satisfies(defaultVer, range, { loose: true })) &&
    !shouldAvoid(defaultVer, avoid)
  ) {
    const mani = versions[defaultVer];
    if (mani && isBefore(verTimes, defaultVer, time)) {
      return mani;
    }
  }

  const allEntries = Object.entries(versions)
    .concat(Object.entries(staged))
    .concat(Object.entries(restricted))
    .filter(([ver, mani]) => isBefore(verTimes, ver, time));

  if (!allEntries.length) {
    throw new Error(`No versions available for ${name}`);
  }

  const sortSemverOpt = { loose: true };
  const entries = allEntries
    .filter(([ver, mani]) => semver.satisfies(ver, range, { loose: true }))
    .sort((a: any, b: any) => {
      const [vera, mania] = a;
      const [verb, manib] = b;
      const notavoida = !shouldAvoid(vera, avoid);
      const notavoidb = !shouldAvoid(verb, avoid);
      const notrestra = !restricted[a];
      const notrestrb = !restricted[b];
      const notstagea = !staged[a];
      const notstageb = !staged[b];
      const notdepra = !mania.deprecated;
      const notdeprb = !manib.deprecated;
      const enginea = engineOk(mania, npmVersion, nodeVersion);
      const engineb = engineOk(manib, npmVersion, nodeVersion);

      // sort by:
      // - not an avoided version
      // - not restricted
      // - not staged
      // - not deprecated and engine ok
      // - engine ok
      // - not deprecated
      // - semver
      return (
        // @ts-ignore
        notavoidb - notavoida ||
        // @ts-ignore
        notrestrb - notrestra ||
        // @ts-ignore
        notstageb - notstagea ||
        // @ts-ignore
        (notdeprb && engineb) - (notdepra && enginea) ||
        // @ts-ignore
        engineb - enginea ||
        // @ts-ignore
        notdeprb - notdepra ||
        semver.rcompare(vera, verb, sortSemverOpt)
      );
    });

  return decorateAvoid(entries[0] && entries[0][1], avoid);
};

export function pickManifest(
  packument: Packages,
  wanted: string,
  opts: PickManifestOptions = {}
) {
  const picked = pink(packument, wanted, opts);
  const policyRestrictions = packument.policyRestrictions;
  const restricted = (policyRestrictions && policyRestrictions.versions) || {};

  if (picked && !restricted[picked.version]) {
    return picked;
  }

  const { before = null } = opts;
  const bstr = before ? new Date(before).toLocaleString() : "";
  const { name } = packument;
  const pckg =
    `${name}@${wanted}` + (before ? ` with a date before ${bstr}` : "");

  const isForbidden = picked && !!restricted[picked.version];
  const polMsg = isForbidden ? policyRestrictions?.message : "";

  throw new Error(
    !isForbidden
      ? `No matching version found for "${pckg}".`
      : `Could not download "${pckg}" due to policy violations:\n"${polMsg}"`
  );
}
