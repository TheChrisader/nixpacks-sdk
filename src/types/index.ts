// ─── Phase ────────────────────────────────────────────────────────────────────

/**
 * A single phase in a Nixpacks build plan (e.g. setup, install, build).
 * All fields are optional; Nixpacks merges phases from provider + config + CLI.
 */
export interface NixpacksPhase {
  /** Commands to run in this phase. Use "..." to extend provider defaults. */
  cmds?: string[];
  /** Nix packages to install (from search.nixos.org). */
  nixPkgs?: string[];
  /** Nix packages whose library paths are appended to LD_LIBRARY_PATH. */
  nixLibs?: string[];
  /** Nix overlays to use as alternate package sources. */
  nixOverlays?: string[];
  /** Pin builds to a specific Nixpkgs archive commit hash. */
  nixpkgsArchive?: string;
  /** Apt packages to install. */
  aptPkgs?: string[];
  /** Only copy these paths into the image before running commands. */
  onlyIncludeFiles?: string[];
  /** Paths to append to the PATH environment variable. */
  paths?: string[];
  /** Phases that must complete before this one starts. */
  dependsOn?: string[];
  /** Directories to cache (do not appear in the final image). */
  cacheDirectories?: string[];
}

// ─── Start ────────────────────────────────────────────────────────────────────

/** Configuration for how the container starts. */
export interface NixpacksStart {
  /** Command to run when starting the container. */
  cmd?: string;
  /** Runtime image to use instead of the build image. */
  runImage?: string;
  /** Files to copy to the run image (requires runImage). */
  onlyIncludeFiles?: string[];
}

// ─── Build Plan ───────────────────────────────────────────────────────────────

/**
 * A full Nixpacks build plan as returned by `nixpacks plan`.
 * This is a JSON-serialisable structure you can save and replay.
 */
export interface NixpacksBuildPlan {
  /** Nixpacks providers to use (e.g. ["node", "python"]). "..." = auto-detect. */
  providers?: string[];
  /** Map of phase name → phase configuration. */
  phases?: Record<string, NixpacksPhase>;
  /** Start command configuration. */
  start?: NixpacksStart;
  /** Arbitrary variables embedded in the plan. */
  variables?: Record<string, string>;
}

// ─── Options ──────────────────────────────────────────────────────────────────

/** Shared options accepted by both `plan` and `build`. */
export interface NixpacksBaseOptions {
  /**
   * Environment variables to pass to the build (KEY=VALUE or just KEY to
   * inherit from the current process environment).
   */
  env?: string[];
  /** Additional Nix packages to install. */
  pkgs?: string[];
  /** Additional apt packages to install. */
  aptPkgs?: string[];
  /** Additional Nix library packages (appended to LD_LIBRARY_PATH). */
  libs?: string[];
  /** Override the detected providers (e.g. ["node"]). */
  providers?: string[];
  /** Path to a nixpacks.toml / nixpacks.json config file. */
  config?: string;
  /**
   * Working directory for the nixpacks process.
   * Defaults to process.cwd().
   */
  cwd?: string;
}

/** Options specific to `nixpacks plan`. */
export type NixpacksPlanOptions = NixpacksBaseOptions;

/** Options specific to `nixpacks build`. */
export interface NixpacksBuildOptions extends NixpacksBaseOptions {
  /** Tag / name for the resulting Docker image (e.g. "my-app:latest"). */
  name?: string;
  /** Override the start command inside the image. */
  startCmd?: string;
  /**
   * If true, suppress all CLI output. Output is always captured and returned
   * in the result regardless of this flag.
   */
  quiet?: boolean;
  /**
   * Callback invoked with each line of stdout/stderr as the build streams.
   * Useful for live progress UI or logging pipelines.
   */
  onLog?: (line: string) => void;
}

// ─── Results ──────────────────────────────────────────────────────────────────

/** Result of a successful `plan` call. */
export interface NixpacksPlanResult {
  /** The parsed build plan. */
  plan: NixpacksBuildPlan;
  /** Raw JSON string returned by the CLI. */
  raw: string;
}

/** Result of a successful `build` call. */
export interface NixpacksBuildResult {
  /** The image name/tag that was built, if one was specified. */
  imageName?: string;
  /** Full combined output (stdout + stderr) of the build process. */
  output: string;
  /** Exit code of the nixpacks process (always 0 on success). */
  exitCode: number;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

/** Base class for all SDK errors. */
export class NixpacksError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NixpacksError";
  }
}

/** Thrown when the `nixpacks` binary cannot be found on PATH. */
export class NixpacksNotFoundError extends NixpacksError {
  constructor() {
    super(
      "nixpacks binary not found. Install it from https://nixpacks.com/docs/getting-started",
    );
    this.name = "NixpacksNotFoundError";
  }
}

/** Thrown when the nixpacks process exits with a non-zero code. */
export class NixpacksCommandError extends NixpacksError {
  /** The exit code of the failed process. */
  public readonly exitCode: number;
  /** Combined stdout + stderr of the failed process. */
  public readonly output: string;
  /** The command + args that were run. */
  public readonly command: string;

  constructor(opts: {
    exitCode: number;
    output: string;
    command: string;
    message?: string;
  }) {
    super(
      opts.message ??
        `nixpacks exited with code ${opts.exitCode}:\n${opts.output}`,
    );
    this.name = "NixpacksCommandError";
    this.exitCode = opts.exitCode;
    this.output = opts.output;
    this.command = opts.command;
  }
}

/** Thrown when the JSON returned by `nixpacks plan` cannot be parsed. */
export class NixpacksPlanParseError extends NixpacksError {
  public readonly raw: string;

  constructor(raw: string, cause: unknown) {
    super(
      `Failed to parse nixpacks plan output: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = "NixpacksPlanParseError";
    this.raw = raw;
  }
}
