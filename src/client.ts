import { execFile } from "child_process";
import { promisify } from "util";
import { runNixpacks } from "./utils/runner";
import { buildBuildArgs, buildPlanArgs } from "./utils/args";
import { NixpacksNotFoundError, NixpacksPlanParseError } from "./types/index";
import type {
  NixpacksBuildOptions,
  NixpacksBuildResult,
  NixpacksPlanOptions,
  NixpacksPlanResult,
} from "./types/index.js";

const execFileAsync = promisify(execFile);

export class NixpacksClient {
  /**
   * Generate a build plan for the given app source directory.
   *
   * @param srcPath - Absolute or relative path to the app source directory.
   * @param opts    - Plan options (env vars, extra packages, config file, …).
   * @returns       The parsed build plan and the raw JSON string.
   *
   * @example
   * ```ts
   * const client = new NixpacksClient();
   * const { plan } = await client.plan("./my-app");
   * console.log(plan.phases?.setup?.nixPkgs);
   * ```
   */
  async plan(
    srcPath: string,
    opts: NixpacksPlanOptions = {},
  ): Promise<NixpacksPlanResult> {
    const args = buildPlanArgs(srcPath, opts);
    const result = await runNixpacks(args, { cwd: opts.cwd });

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.stdout);
    } catch (err) {
      throw new NixpacksPlanParseError(result.stdout, err);
    }

    return {
      plan: parsed as NixpacksPlanResult["plan"],
      raw: result.stdout,
    };
  }

  /**
   * Build a Docker image from the given app source directory.
   *
   * @param srcPath - Absolute or relative path to the app source directory.
   * @param opts    - Build options (image name, start command, streaming, …).
   * @returns       Build result including the image name and full log output.
   *
   * @example
   * ```ts
   * const client = new NixpacksClient();
   * const result = await client.build("./my-app", {
   *   name: "my-app:latest",
   *   onLog: (line) => process.stdout.write(line + "\n"),
   * });
   * console.log("Built image:", result.imageName);
   * ```
   */
  async build(
    srcPath: string,
    opts: NixpacksBuildOptions = {},
  ): Promise<NixpacksBuildResult> {
    const args = buildBuildArgs(srcPath, opts);

    if (!opts.quiet) {
      const result = await runNixpacks(args, {
        cwd: opts.cwd,
        onLog: opts.onLog,
      });
      return {
        imageName: opts.name,
        output: result.combined,
        exitCode: result.exitCode,
      };
    }

    const result = await runNixpacks(args, { cwd: opts.cwd });
    return {
      imageName: opts.name,
      output: result.combined,
      exitCode: result.exitCode,
    };
  }

  /**
   * Check whether the `nixpacks` binary is available on PATH.
   *
   * @returns The installed nixpacks version string (e.g. "0.26.0"), or
   *          `null` if nixpacks is not installed.
   *
   * @example
   * ```ts
   * const version = await client.version();
   * if (!version) console.error("nixpacks is not installed!");
   * ```
   */
  async version(): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync("nixpacks", ["--version"]);
      return stdout.trim();
    } catch {
      return null;
    }
  }

  /**
   * Assert that nixpacks is installed, throwing `NixpacksNotFoundError` if not.
   *
   * Useful as a startup check in applications that depend on nixpacks.
   */
  async assertInstalled(): Promise<void> {
    const v = await this.version();
    if (!v) throw new NixpacksNotFoundError();
  }
}
