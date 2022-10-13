import * as semver from "esm-semver";

// git://
// npm://
// http://
// https://
export const isUnsupportedVersionFormat = (v: string) => {
  if (!v) return false;
  return v.includes(":");
};

export interface VersionInfo {
  rawSpec: string;
  fetchSpec: string;
  type: "version" | "range" | "tag";
}

export const getVersionInfo = (rawSpec: string) => {
  if (isUnsupportedVersionFormat(rawSpec)) return null;
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
