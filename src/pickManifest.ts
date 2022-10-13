import * as semver from "esm-semver";
import { getVersionInfo } from "./utils";

const isBefore = (verTimes: any, ver: any, time: any) =>
  !verTimes || !verTimes[ver] || Date.parse(verTimes[ver]) <= time;

const avoidSemverOpt = { includePrerelease: true, loose: true };
const shouldAvoid = (ver: any, avoid: any) =>
  avoid && semver.satisfies(ver, avoid, avoidSemverOpt);

const decorateAvoid = (result: any, avoid: any) =>
  result && shouldAvoid(result.version, avoid)
    ? { ...result, _shouldAvoid: true }
    : result;

const _pickManifest = (packument: any, wanted: string, opts: any): any => {
  const {
    defaultTag = "latest",
    before = null,
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
  const type = spec!.type;
  const distTags = packument["dist-tags"] || {};

  if (type !== "tag" && type !== "version" && type !== "range") {
    throw new Error("Only tag, version, and range are supported");
  }

  // 如果类型是 'tag'，而不仅仅是隐含的默认类型，那么它就必须是这个类型，否则其他类型都不行。
  if (wanted && type === "tag") {
    const ver = distTags[wanted];
    // 如果 dist-tags 中的版本是在 before 日期之前，那么
    // 我们就使用这个版本。 否则，我们将得到优先级最高的版本
    // 在 dist-tag 之前。
    if (isBefore(verTimes, ver, time)) {
      return decorateAvoid(
        versions[ver] || staged[ver] || restricted[ver],
        avoid
      );
    } else {
      return _pickManifest(packument, `<=${ver}`, opts);
    }
  }

  // 类似地，如果是一个特定的版本，那么只有那个版本可以
  if (wanted && type === "version") {
    const ver = semver.clean(wanted, { loose: true });
    const mani =
      versions[ver as any] || staged[ver as any] || restricted[ver as any];
    return isBefore(verTimes, ver, time) ? decorateAvoid(mani, avoid) : null;
  }

  // 根据我们的启发式方法进行排序，并挑选最适合的。
  const range = type === "range" ? wanted : "*";

  // 如果范围是*，那么如果有的话，我们就选择 "最新 "的。
  // 但如果应该避免，则跳过这一点，在这种情况下，我们必须
  // 要更努力地尝试。
  const defaultVer = distTags[defaultTag];
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

  // 实际上要对名单进行分类。
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
        notdeprb - notdepra ||
        semver.rcompare(vera, verb, sortSemverOpt)
      );
    });

  return decorateAvoid(entries[0] && entries[0][1], avoid);
};

export function pickManifest(packument: any, wanted: string, opts = {}) {
  const mani = _pickManifest(packument, wanted, opts);
  const picked = mani;
  const policyRestrictions = packument.policyRestrictions;
  const restricted = (policyRestrictions && policyRestrictions.versions) || {};

  if (picked && !restricted[picked.version]) {
    return picked;
  }

  const { before = null, defaultTag = "latest" } = opts as any;
  const bstr = before ? new Date(before).toLocaleString() : "";
  const { name } = packument;
  const pckg =
    `${name}@${wanted}` + (before ? ` with a date before ${bstr}` : "");

  const isForbidden = picked && !!restricted[picked.version];
  const polMsg = isForbidden ? policyRestrictions.message : "";

  throw new Error(
    !isForbidden
      ? `No matching version found for "${pckg}".`
      : `Could not download "${pckg}" due to policy violations:\n"${polMsg}"`
  );
}
