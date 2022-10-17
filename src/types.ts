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
  registry?: string;
  fullMetadata?: boolean;
  [key: string]: any; // fullMetadata
}

export interface DetailPackage {
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
  engines?: {
    npm?: string;
    node?: string;
  };
  deprecated?: boolean;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface Packages {
  name: string;
  modified: string;
  versions: Record<string, DetailPackage>;
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
    versions?: Record<string, DetailPackage>;
  };
  stagedVersions?: {
    versions?: Record<string, DetailPackage>;
  };
}
