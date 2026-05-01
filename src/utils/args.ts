import type {
  NixpacksBaseOptions,
  NixpacksBuildOptions,
} from "../types/index.js";

/**
 * Convert shared base options into CLI flag arrays.
 */
export function buildBaseArgs(opts: NixpacksBaseOptions): string[] {
  const args: string[] = [];

  if (opts.env) {
    for (const e of opts.env) {
      args.push("--env", e);
    }
  }

  if (opts.pkgs) {
    for (const p of opts.pkgs) {
      args.push("--pkgs", p);
    }
  }

  if (opts.aptPkgs) {
    for (const p of opts.aptPkgs) {
      args.push("--apt", p);
    }
  }

  if (opts.libs) {
    for (const l of opts.libs) {
      args.push("--libs", l);
    }
  }

  if (opts.providers) {
    for (const p of opts.providers) {
      args.push("--provider", p);
    }
  }

  if (opts.config) {
    args.push("--config", opts.config);
  }

  return args;
}

/**
 * Append build-specific flags on top of the base args.
 */
export function buildBuildArgs(
  srcPath: string,
  opts: NixpacksBuildOptions,
): string[] {
  const args: string[] = ["build", srcPath];

  if (opts.name) {
    args.push("--name", opts.name);
  }

  if (opts.startCmd) {
    args.push("--start-cmd", opts.startCmd);
  }

  args.push(...buildBaseArgs(opts));

  return args;
}

/**
 * Build the args array for `nixpacks plan`.
 */
export function buildPlanArgs(
  srcPath: string,
  opts: NixpacksBaseOptions,
): string[] {
  return ["plan", srcPath, ...buildBaseArgs(opts)];
}
