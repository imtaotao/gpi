import * as semver from "esm-semver";
import type { VersionInfo } from "./types";

export interface Defer {
  p: Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export const createDefer = () => {
  const defer: Defer = {} as any;
  defer.p = new Promise((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  return defer;
};

// git://
// npm://
// http://
// https://
export const isUnsupportedVersionFormat = (v?: string) =>
  Boolean(v && v.includes(":"));

export const getVersionInfo = (rawSpec: string) => {
  if (isUnsupportedVersionFormat(rawSpec)) {
    throw new Error(`Temporarily unsupported protocols: "${rawSpec}"`);
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
