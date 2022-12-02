export interface VersionInfo {
  rawSpec: string;
  fetchSpec: string;
  type: "version" | "range" | "tag";
}

export interface PickManifestOptions {
  defaultTag?: string;
  before?: string | number | Date;
  nodeVersion?: string;
  npmVersion?: string;
  includeStaged?: boolean;
  avoid?: string;
}

export type RetryType = (
  name: string,
  times: number,
  nextRequest: () => void
) => boolean | void;

export type GpiOptions = {
  registry?: string;
  retry?: RetryType;
  fullMetadata?: boolean;
  customFetch?: typeof fetch;
} & PickManifestOptions;

export interface PackageData {
  name: string;
  version: string;
  dist: {
    fileCount: number;
    integrity: string;
    "npm-signature": string;
    shasum: string;
    tarball: string;
    unpackedSize: number;
    signatures: Array<{
      sig: string;
      keyid: string;
    }>;
  };
  bin?: string | Record<string, string>;
  engines?: {
    npm?: string;
    node?: string;
  };
  deprecated?: boolean;
  overrides?: Record<string, string>;
  bundleDependencies?: Array<string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  acceptDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional: boolean }>;
}

export interface Packages {
  name: string;
  modified: string;
  versions: Record<string, PackageData>;
  "dist-tags": {
    beta: string;
    experimental: string;
    latest: string;
    next: string;
    rc: string;
  };
  _cached: boolean;
  _contentLength: number;
  time?: Record<string, string>;
  policyRestrictions?: {
    message?: string;
    versions?: Record<string, PackageData>;
  };
  stagedVersions?: {
    versions?: Record<string, PackageData>;
  };
}
