import * as semver from "esm-semver";
import type { VersionInfo } from "./types";

// git://
// npm://
// http://
// https://
export const isUnsupportedVersionFormat = (v?: string) =>
  Boolean(v && v.includes(":"));

export const getVersionInfo = (rawSpec: string) => {
  if (isUnsupportedVersionFormat(rawSpec)) {
    throw new Error(``);
  }
  const res = { rawSpec } as VersionInfo;
  const spec = res.rawSpec === "" ? "latest" : res.rawSpec.trim();
  res.fetchSpec = spec;
  const version = semver.valid(spec, true);
  const range = semver.validRange(spec, true);
  if (version) {
    res.type = "version";
  } else if (range) {
    res.type = "range";
  } else {
    if (encodeURIComponent(spec) !== spec) {
      new Error(
        `Invalid tag name "${spec}": Tags may not have any characters that encodeURIComponent encodes.`
      );
    }
    res.type = "tag";
  }
  return res;
};
